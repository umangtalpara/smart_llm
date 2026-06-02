import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ApiKeysRepository } from '../api-keys/api-keys.repository';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ProvidersService } from '../providers/providers.service';
import { RedisService } from '../../cache/redis.service';
import { ProviderCode, RotationStrategy, KeyStatus } from '../../../../shared/types';
import { ApiKeyDocument } from '../api-keys/schemas/api-key.schema';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly defaultCooldownSeconds = 60; // 1 minute default cooldown

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly apiKeysService: ApiKeysService,
    private readonly providersService: ProvidersService,
    private readonly redisService: RedisService,
    @InjectQueue('request-logs') private readonly requestLogsQueue: Queue,
  ) {}

  async executeProxyChatCompletion(
    userId: string,
    body: any,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
    group?: string,
  ): Promise<any> {
    const model = body.model;
    if (!model) {
      throw new BadRequestException('Model is required in request payload');
    }

    const provider = this.resolveProviderFromModel(model);
    const maxAttempts = 3;
    let attempts = 0;
    const errors: any[] = [];
    const rotatedFromKeys: string[] = [];
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      
      // Select the best available active key
      const key = await this.selectKey(userId, provider, group, strategy);
      if (!key) {
        // Log final failure before throwing
        const durationMs = Date.now() - startTime;
        await this.publishRequestLog(
          userId,
          undefined,
          provider,
          model,
          '/chat/completions',
          durationMs,
          HttpStatus.SERVICE_UNAVAILABLE,
          `All active API keys for provider ${provider} are exhausted or currently in cooldown.`,
          0,
          0,
          0,
          rotatedFromKeys,
        );

        throw new ServiceUnavailableException(
          `All active API keys for provider ${provider} are exhausted or currently in cooldown.`,
        );
      }

      this.logger.log(
        `Attempt ${attempts}/${maxAttempts}: Selected Key ${key.name} (${key.keyMask}) for provider ${provider}`,
      );

      try {
        const decryptedKey = await this.apiKeysService.getDecryptedKeyValue(userId, key.id);
        const adapter = this.providersService.getAdapter(provider);

        // Record start time to measure latency
        const response = await adapter.executeChatCompletion(decryptedKey, body);

        // Success: increment metrics
        await this.apiKeysRepository.update(key.id, {
          successCount: key.successCount + 1,
          lastUsedAt: new Date(),
        });

        // Publish background log job
        const durationMs = Date.now() - startTime;
        const promptTokens = response?.usage?.prompt_tokens || 0;
        const completionTokens = response?.usage?.completion_tokens || 0;
        const totalTokens = response?.usage?.total_tokens || 0;

        await this.publishRequestLog(
          userId,
          key.id,
          provider,
          model,
          '/chat/completions',
          durationMs,
          200,
          undefined,
          promptTokens,
          completionTokens,
          totalTokens,
          rotatedFromKeys,
        );

        return response;
      } catch (err: any) {
        errors.push(err);
        rotatedFromKeys.push(key.id);
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const errMsg = err.message || 'Unknown provider error';
        
        this.logger.warn(
          `Key ${key.name} (${key.keyMask}) failed with status ${status}: ${errMsg}`,
        );

        // Perform failover & cooldown logic
        await this.handleKeyFailure(key, status, errMsg);
      }
    }

    // If all retries exhausted, bubble up the last error
    const durationMs = Date.now() - startTime;
    const lastError = errors[errors.length - 1];
    const status = lastError instanceof HttpException ? lastError.getStatus() : 500;
    const errMsg = lastError?.message || 'Unknown failure';

    await this.publishRequestLog(
      userId,
      undefined,
      provider,
      model,
      '/chat/completions',
      durationMs,
      status,
      errMsg,
      0,
      0,
      0,
      rotatedFromKeys,
    );

    if (lastError instanceof HttpException) {
      throw lastError;
    }
    throw new HttpException(
      `All key rotation attempts exhausted. Last error: ${lastError?.message || 'Unknown failure'}`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  async executeProxyEmbeddings(
    userId: string,
    body: any,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
    group?: string,
  ): Promise<any> {
    const model = body.model;
    if (!model) {
      throw new BadRequestException('Model is required in request payload');
    }

    const provider = this.resolveProviderFromModel(model);
    const maxAttempts = 3;
    let attempts = 0;
    const errors: any[] = [];
    const rotatedFromKeys: string[] = [];
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      
      // Select the best available active key
      const key = await this.selectKey(userId, provider, group, strategy);
      if (!key) {
        // Log final failure before throwing
        const durationMs = Date.now() - startTime;
        await this.publishRequestLog(
          userId,
          undefined,
          provider,
          model,
          '/embeddings',
          durationMs,
          HttpStatus.SERVICE_UNAVAILABLE,
          `All active API keys for provider ${provider} are exhausted or currently in cooldown.`,
          0,
          0,
          0,
          rotatedFromKeys,
        );

        throw new ServiceUnavailableException(
          `All active API keys for provider ${provider} are exhausted or currently in cooldown.`,
        );
      }

      this.logger.log(
        `Attempt ${attempts}/${maxAttempts}: Selected Key ${key.name} (${key.keyMask}) for provider ${provider} (Embeddings)`,
      );

      try {
        const decryptedKey = await this.apiKeysService.getDecryptedKeyValue(userId, key.id);
        const adapter = this.providersService.getAdapter(provider);

        if (!adapter.executeEmbeddings) {
          throw new BadRequestException(`Provider ${provider} does not support embeddings.`);
        }

        // Execute embedding call
        const response = await adapter.executeEmbeddings(decryptedKey, body);

        // Success: increment metrics
        await this.apiKeysRepository.update(key.id, {
          successCount: key.successCount + 1,
          lastUsedAt: new Date(),
        });

        // Publish background log job
        const durationMs = Date.now() - startTime;
        const promptTokens = response?.usage?.prompt_tokens || 0;
        const totalTokens = response?.usage?.total_tokens || 0;

        await this.publishRequestLog(
          userId,
          key.id,
          provider,
          model,
          '/embeddings',
          durationMs,
          200,
          undefined,
          promptTokens,
          0,
          totalTokens,
          rotatedFromKeys,
        );

        return response;
      } catch (err: any) {
        errors.push(err);
        rotatedFromKeys.push(key.id);
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const errMsg = err.message || 'Unknown provider error';
        
        this.logger.warn(
          `Key ${key.name} (${key.keyMask}) failed with status ${status}: ${errMsg}`,
        );

        // Perform failover & cooldown logic
        await this.handleKeyFailure(key, status, errMsg);
      }
    }

    // If all retries exhausted, bubble up the last error
    const durationMs = Date.now() - startTime;
    const lastError = errors[errors.length - 1];
    const status = lastError instanceof HttpException ? lastError.getStatus() : 500;
    const errMsg = lastError?.message || 'Unknown failure';

    await this.publishRequestLog(
      userId,
      undefined,
      provider,
      model,
      '/embeddings',
      durationMs,
      status,
      errMsg,
      0,
      0,
      0,
      rotatedFromKeys,
    );

    if (lastError instanceof HttpException) {
      throw lastError;
    }
    throw new HttpException(
      `All key rotation attempts exhausted. Last error: ${lastError?.message || 'Unknown failure'}`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async publishRequestLog(
    userId: string,
    apiKeyId: string | undefined,
    provider: ProviderCode,
    model: string,
    path: string,
    durationMs: number,
    statusCode: number,
    errorMsg?: string,
    promptTokens = 0,
    completionTokens = 0,
    totalTokens = 0,
    rotatedFromKeys: string[] = [],
  ): Promise<void> {
    try {
      await this.requestLogsQueue.add('log-request', {
        userId,
        apiKeyId,
        provider,
        model,
        path,
        durationMs,
        statusCode,
        errorMsg,
        promptTokens,
        completionTokens,
        totalTokens,
        rotatedFromKeys,
      });
    } catch (err: any) {
      this.logger.error(`Failed to publish request log job to BullMQ: ${err.message}`);
    }
  }

  getSupportedModels() {
    return {
      object: 'list',
      data: [
        { id: 'gpt-4o', object: 'model', created: 1715644800, owned_by: 'openai' },
        { id: 'gpt-4-turbo', object: 'model', created: 1712620800, owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', object: 'model', created: 1677628800, owned_by: 'openai' },
        { id: 'text-embedding-3-small', object: 'model', created: 1706140800, owned_by: 'openai' },
        { id: 'text-embedding-3-large', object: 'model', created: 1706140800, owned_by: 'openai' },
        { id: 'gemini-1.5-pro', object: 'model', created: 1715644800, owned_by: 'gemini' },
        { id: 'gemini-1.5-flash', object: 'model', created: 1715644800, owned_by: 'gemini' },
        { id: 'claude-3-5-sonnet', object: 'model', created: 1718841600, owned_by: 'claude' },
        { id: 'claude-3-haiku', object: 'model', created: 1710374400, owned_by: 'claude' },
        { id: 'llama3-8b-8192', object: 'model', created: 1713436800, owned_by: 'groq' },
        { id: 'llama3-70b-8192', object: 'model', created: 1713436800, owned_by: 'groq' },
        { id: 'mixtral-8x7b-32768', object: 'model', created: 1702339200, owned_by: 'groq' },
      ],
    };
  }

  private async selectKey(
    userId: string,
    provider: ProviderCode,
    group?: string,
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
    provider: ProviderCode,
    keys: ApiKeyDocument[],
  ): Promise<ApiKeyDocument> {
    const redisKeyIndex = `user:${userId}:provider:${provider}:rr_index`;
    const lastIndexStr = await this.redisService.get(redisKeyIndex);
    const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;

    const nextIndex = (lastIndex + 1) % keys.length;
    await this.redisService.set(redisKeyIndex, nextIndex.toString());

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

    return await this.applyRoundRobin(userId, `${provider}:prio:${highestPriority}` as any, highestPriorityKeys);
  }

  private applyHealthBasedRotation(keys: ApiKeyDocument[]): ApiKeyDocument {
    // Sort keys by error rate ascending (lowest error rate first)
    // Error rate is errorCount / (successCount + errorCount)
    return keys.sort((a, b) => {
      const totalA = a.successCount + a.errorCount;
      const totalB = b.successCount + b.errorCount;
      const rateA = totalA > 0 ? a.errorCount / totalA : 0;
      const rateB = totalB > 0 ? b.errorCount / totalB : 0;
      return rateA - rateB;
    })[0]!;
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

  private async handleKeyFailure(key: ApiKeyDocument, status: number, message: string): Promise<void> {
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
        `API Key ${key.name} (${key.keyMask}) was permanently deactivated due to invalid credentials (status ${status}).`,
      );
      // Trigger notification placeholder (Phase 5 will hook this up natively)
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
        `API Key ${key.name} (${key.keyMask}) placed in cooldown for ${this.defaultCooldownSeconds}s due to status ${status}.`,
      );
    }
  }

  private resolveProviderFromModel(model: string): ProviderCode {
    const lowercaseModel = model.toLowerCase();
    if (lowercaseModel.includes('gpt') || lowercaseModel.includes('o1') || lowercaseModel.includes('text-embedding')) {
      return ProviderCode.OPENAI;
    }
    if (lowercaseModel.includes('gemini')) {
      return ProviderCode.GEMINI;
    }
    if (lowercaseModel.includes('claude')) {
      return ProviderCode.CLAUDE;
    }
    if (lowercaseModel.includes('llama') || lowercaseModel.includes('mixtral') || lowercaseModel.includes('gemma')) {
      // Groq is the default proxy for open-source LLMs in this setup
      return ProviderCode.GROQ;
    }
    return ProviderCode.OPENAI; // Fallback default
  }
}
