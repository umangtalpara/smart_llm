import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { UsageStat, UsageStatDocument } from '../monitor/schemas/usage-stat.schema';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema';
import { NotificationType, NotificationSeverity } from './schemas/notification.schema';
import { RedisService } from '../../cache/redis.service';
import { KeyStatus, ProviderCode } from '../../../../shared/types';
import { NotificationsService } from './notifications.service';

const PROVIDERS = [ProviderCode.OPENAI, ProviderCode.GEMINI, ProviderCode.CLAUDE, ProviderCode.GROQ];
const ALERT_DEDUP_TTL_SECONDS = 600; // 10 minutes

@Processor('request-logs')
export class AlertProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectModel(UsageStat.name) private readonly usageStatModel: Model<UsageStatDocument>,
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<void> {
    const userId = job.data.userId as string | undefined;
    const provider = job.data.provider as string | undefined;
    const statusCode = job.data.statusCode as number | undefined;
    if (!userId || !provider || statusCode === undefined) return;

    try {
      await Promise.all([
        this.checkKeyExhausted(userId, statusCode, provider),
        this.checkHighErrorRate(userId),
        this.checkProviderDown(userId),
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`AlertProcessor failed for job ${job.id}: ${errMsg}`, errStack);
      // Do NOT rethrow — alert failures must never block log processing
    }
  }

  // ── Rule 1: Key returned 401 (invalid / exhausted) ──────────────────────────
  private async checkKeyExhausted(userId: string, statusCode: number, provider: string) {
    if (statusCode !== 401) return;

    const dedupKey = `alert:${userId}:key_exhausted:${provider}`;
    if (await this.redisService.exists(dedupKey)) return;

    await this.createNotification({
      userId,
      type: NotificationType.KEY_EXHAUSTED,
      severity: NotificationSeverity.WARNING,
      title: `API Key Rejected — ${this.providerLabel(provider)}`,
      message: `A ${this.providerLabel(provider)} key returned 401 Unauthorized. It may be invalid or exhausted. Review your keys in API Key Management.`,
      metadata: { provider },
    });

    await this.redisService.setWithTtl(dedupKey, '1', ALERT_DEDUP_TTL_SECONDS);
  }

  // ── Rule 2: Today's error rate > 30% ────────────────────────────────────────
  private async checkHighErrorRate(userId: string) {
    const dedupKey = `alert:${userId}:high_error_rate`;
    if (await this.redisService.exists(dedupKey)) return;

    const dateStr = new Date().toISOString().split('T')[0]!;
    const stat = await this.usageStatModel.findOne({ userId, date: dateStr });
    if (!stat || stat.requestCount < 10) return; // Need enough volume to be meaningful

    const errorRate = stat.failCount / stat.requestCount;
    if (errorRate < 0.30) return;

    const ratePercent = Math.round(errorRate * 100);

    await this.createNotification({
      userId,
      type: NotificationType.HIGH_ERROR_RATE,
      severity: NotificationSeverity.WARNING,
      title: `High Error Rate Detected — ${ratePercent}% Failures Today`,
      message: `${stat.failCount} out of ${stat.requestCount} requests failed today (${ratePercent}% error rate). Check provider health and your API keys.`,
      metadata: { errorRate: ratePercent, failCount: stat.failCount, requestCount: stat.requestCount, date: dateStr },
    });

    await this.redisService.setWithTtl(dedupKey, '1', ALERT_DEDUP_TTL_SECONDS);
  }

  // ── Rule 3: All keys for a provider are in cooldown ─────────────────────────
  private async checkProviderDown(userId: string) {
    const now = new Date();

    for (const provider of PROVIDERS) {
      const dedupKey = `alert:${userId}:provider_down:${provider}`;
      if (await this.redisService.exists(dedupKey)) continue;

      const keys = await this.apiKeyModel.find({
        userId,
        provider,
        status: { $ne: KeyStatus.INACTIVE },
      });

      if (keys.length === 0) continue;

      let cooldownCount = 0;
      for (const key of keys) {
        const isDbCooldown = key.cooldownUntil && key.cooldownUntil > now;
        const isRedisCooldown = await this.redisService.exists(`key:cooldown:${key._id}`);
        if (isDbCooldown || isRedisCooldown) cooldownCount++;
      }

      if (cooldownCount < keys.length) continue;

      await this.createNotification({
        userId,
        type: NotificationType.PROVIDER_DOWN,
        severity: NotificationSeverity.CRITICAL,
        title: `All ${this.providerLabel(provider)} Keys Blocked`,
        message: `All ${keys.length} of your ${this.providerLabel(provider)} key${keys.length > 1 ? 's are' : ' is'} currently on cooldown. Requests to this provider will fail until cooldowns expire.`,
        metadata: { provider, keyCount: keys.length },
      });

      await this.redisService.setWithTtl(dedupKey, '1', ALERT_DEDUP_TTL_SECONDS);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private async createNotification(dto: {
    userId: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.notificationsService.createNotification(dto);
  }

  private providerLabel(provider: string): string {
    const labels: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini',
      claude: 'Claude',
      groq: 'Groq',
    };
    return labels[provider] ?? provider;
  }
}
