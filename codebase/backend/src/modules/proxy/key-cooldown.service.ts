import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { ApiKeysRepository } from '../api-keys/api-keys.repository';
import { RedisService } from '../../cache/redis.service';
import { KeyStatus } from '../../../../shared/types';
import { ApiKeyDocument } from '../api-keys/schemas/api-key.schema';

@Injectable()
export class KeyCooldownService {
  private readonly logger = new Logger(KeyCooldownService.name);
  private readonly defaultCooldownSeconds = 60; // 1 minute default cooldown

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly redisService: RedisService,
  ) {}

  async handleKeyFailure(key: ApiKeyDocument, status: number, message: string): Promise<void> {
    // Increment overall key error count
    await this.apiKeysRepository.update(key.id, {
      errorCount: key.errorCount + 1,
    });

    // 1. Permanently deactivate key on 401 Unauthorized or 403 Forbidden (Invalid API Key)
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      await this.apiKeysRepository.update(key.id, {
        status: KeyStatus.INACTIVE,
      });
      this.logger.error(
        `API Key ${key.name} (${key.keyMask}) was permanently deactivated due to invalid credentials (status ${status}). Message: ${message}`,
      );
      return;
    }

    // 2. Put key in temporary cooldown on 429 Too Many Requests (Rate limit) or 5xx/timeout errors
    if (status === HttpStatus.TOO_MANY_REQUESTS || status >= 500 || status === 0) {
      const cooldownUntil = new Date(Date.now() + this.defaultCooldownSeconds * 1000);

      // Update DB cooldown state
      await this.apiKeysRepository.update(key.id, {
        cooldownUntil,
      });

      // Lock key in Redis with TTL matching default cooldown
      const redisCooldownKey = `key:cooldown:${key.id}`;
      await this.redisService.setWithTtl(
        redisCooldownKey,
        'COOLDOWN_ACTIVE',
        this.defaultCooldownSeconds,
      );

      this.logger.warn(
        `API Key ${key.name} (${key.keyMask}) placed in cooldown for ${this.defaultCooldownSeconds}s due to status ${status}. Message: ${message}`,
      );
    }
  }
}
