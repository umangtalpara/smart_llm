import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestLog, RequestLogDocument } from './schemas/request-log.schema';
import { UsageStat, UsageStatDocument } from './schemas/usage-stat.schema';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema';
import { ProviderCode, KeyStatus } from '../../../../shared/types';
import { RedisService } from '../../cache/redis.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    @InjectModel(RequestLog.name) private readonly requestLogModel: Model<RequestLogDocument>,
    @InjectModel(UsageStat.name) private readonly usageStatModel: Model<UsageStatDocument>,
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly redisService: RedisService,
  ) {}

  async getMetrics(userId: string) {
    // 1. Fetch active keys count
    const activeKeys = await this.apiKeyModel.countDocuments({
      userId,
      status: KeyStatus.ACTIVE,
    });

    // 2. Fetch usage stats total aggregates
    const stats = await this.usageStatModel.find({ userId });
    
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalTokens = 0;

    for (const stat of stats) {
      totalRequests += stat.requestCount;
      totalSuccess += stat.successCount;
      totalTokens += stat.totalTokens;
    }

    const successRate = totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 100) : 100;

    return {
      totalRequests,
      successRate,
      activeKeys,
      totalTokens,
    };
  }

  async getChartData(userId: string, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const dateLimitStr = cutoffDate.toISOString().split('T')[0]!;

    const stats = await this.usageStatModel
      .find({
        userId,
        date: { $gte: dateLimitStr },
      })
      .sort({ date: 1 });

    return stats.map((stat) => {
      const avgLatencyMs = stat.successCount > 0 ? Math.round(stat.latencySumMs / stat.successCount) : 0;
      return {
        date: stat.date,
        requests: stat.requestCount,
        success: stat.successCount,
        failed: stat.failCount,
        tokens: stat.totalTokens,
        avgLatencyMs,
      };
    });
  }

  async getLogs(
    userId: string,
    page = 1,
    limit = 20,
    provider?: ProviderCode,
    statusCode?: number,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { userId };

    if (provider) {
      query.provider = provider;
    }
    if (statusCode) {
      query.statusCode = statusCode;
    }

    const total = await this.requestLogModel.countDocuments(query);
    const logs = await this.requestLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      data: logs.map((log) => ({
        id: log._id,
        provider: log.provider,
        model: log.model,
        path: log.path,
        durationMs: log.durationMs,
        statusCode: log.statusCode,
        errorMsg: log.errorMsg,
        promptTokens: log.promptTokens,
        completionTokens: log.completionTokens,
        totalTokens: log.totalTokens,
        rotatedFromKeys: log.rotatedFromKeys || [],
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHealthStatus(userId: string) {
    const providers = [
      ProviderCode.OPENAI,
      ProviderCode.GEMINI,
      ProviderCode.CLAUDE,
      ProviderCode.GROQ,
    ];

    const healthData: any = {};

    for (const provider of providers) {
      // Find all keys for this provider that are enabled (either active or cooldown, since cooldown keys are active keys technically under rate limit)
      const keys = await this.apiKeyModel.find({
        userId,
        provider,
        status: { $ne: KeyStatus.INACTIVE },
      });

      if (keys.length === 0) {
        healthData[provider] = {
          status: 'inactive',
          activeKeys: 0,
          cooldownKeys: 0,
          label: 'No Keys Registered',
        };
        continue;
      }

      let cooldownCount = 0;
      const now = new Date();

      for (const key of keys) {
        // DB check
        const isDbCooldown = key.cooldownUntil && key.cooldownUntil > now;
        
        // Redis check
        const redisCooldownKey = `key:cooldown:${key._id}`;
        const isRedisCooldown = await this.redisService.exists(redisCooldownKey);

        if (isDbCooldown || isRedisCooldown) {
          cooldownCount++;
        }
      }

      let status = 'healthy';
      let label = '100% Active';

      if (cooldownCount === keys.length) {
        status = 'down';
        label = 'All Keys Blocked';
      } else if (cooldownCount > 0) {
        status = 'degraded';
        label = 'Partially Blocked';
      }

      healthData[provider] = {
        status,
        activeKeys: keys.length - cooldownCount,
        cooldownKeys: cooldownCount,
        label,
      };
    }

    return healthData;
  }
}
