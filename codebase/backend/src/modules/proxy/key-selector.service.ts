import { Injectable } from '@nestjs/common';
import { ApiKeysRepository } from '../api-keys/api-keys.repository';
import { RedisService } from '../../cache/redis.service';
import { ProviderCode, RotationStrategy } from '../../../../shared/types';
import { ApiKeyDocument } from '../api-keys/schemas/api-key.schema';

@Injectable()
export class KeySelectorService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly redisService: RedisService,
  ) {}

  async selectKey(
    userId: string,
    provider: ProviderCode,
    group: string | undefined,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
  ): Promise<ApiKeyDocument | null> {
    // 1. Fetch active keys from repository
    const activeKeys = await this.apiKeysRepository.findActiveKeys(userId, provider, group);
    if (activeKeys.length === 0) {
      return null;
    }

    // 2. Filter out keys in cooldown (both DB checks and Redis locks)
    const availableKeys: ApiKeyDocument[] = [];
    const now = new Date();

    for (const key of activeKeys) {
      // DB check
      if (key.cooldownUntil && key.cooldownUntil > now) {
        continue;
      }

      // Redis check (for immediate caching safety)
      const redisCooldownKey = `key:cooldown:${key.id}`;
      const hasCooldown = await this.redisService.exists(redisCooldownKey);
      if (hasCooldown) {
        continue;
      }

      availableKeys.push(key);
    }

    if (availableKeys.length === 0) {
      return null;
    }

    // 3. Apply selected strategy
    switch (strategy) {
      case RotationStrategy.ROUND_ROBIN:
        return await this.applyRoundRobin(userId, provider, availableKeys);
      case RotationStrategy.PRIORITY:
        return await this.applyPriorityRotation(userId, provider, availableKeys);
      case RotationStrategy.HEALTH_BASED:
        return this.applyHealthBasedRotation(availableKeys);
      case RotationStrategy.WEIGHTED:
        return this.applyWeightedRotation(availableKeys);
      default:
        return availableKeys[0] || null;
    }
  }

  private async applyRoundRobin(
    userId: string,
    providerKey: string,
    keys: ApiKeyDocument[],
  ): Promise<ApiKeyDocument> {
    const redisKeyIndex = `user:${userId}:provider:${providerKey}:rr_index`;
    const lastIndexStr = await this.redisService.get(redisKeyIndex);
    const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;

    const nextIndex = (lastIndex + 1) % keys.length;
    await this.redisService.set(redisKeyIndex, nextIndex.toString());

    // Safe non-null assertion since nextIndex is bounded by length
    return keys[nextIndex]!;
  }

  private async applyPriorityRotation(
    userId: string,
    provider: ProviderCode,
    keys: ApiKeyDocument[],
  ): Promise<ApiKeyDocument> {
    // Keys are already sorted by priority descending from repository.
    // Group keys by their priority, select the highest available, and Round Robin within that subset.
    const highestPriority = keys[0]!.priority;
    const highestPriorityKeys = keys.filter((k) => k.priority === highestPriority);

    return await this.applyRoundRobin(userId, `${provider}:prio:${highestPriority}`, highestPriorityKeys);
  }

  private applyHealthBasedRotation(keys: ApiKeyDocument[]): ApiKeyDocument {
    // Sort keys by error rate ascending (lowest error rate first)
    // Error rate is errorCount / (successCount + errorCount)
    const sorted = [...keys].sort((a, b) => {
      const totalA = a.successCount + a.errorCount;
      const totalB = b.successCount + b.errorCount;
      const rateA = totalA > 0 ? a.errorCount / totalA : 0;
      const rateB = totalB > 0 ? b.errorCount / totalB : 0;
      return rateA - rateB;
    });
    return sorted[0]!;
  }

  private applyWeightedRotation(keys: ApiKeyDocument[]): ApiKeyDocument {
    // Select key dynamically favoring higher priorities
    const totalWeight = keys.reduce((sum, key) => sum + key.priority, 0);
    let random = Math.random() * totalWeight;

    for (const key of keys) {
      random -= key.priority;
      if (random <= 0) {
        return key;
      }
    }

    return keys[0]!;
  }
}
