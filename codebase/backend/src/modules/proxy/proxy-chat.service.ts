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
import { ProviderCode, RotationStrategy } from '../../../../shared/types';
import { KeySelectorService } from './key-selector.service';
import { KeyCooldownService } from './key-cooldown.service';
import { LlmResponse } from '../providers/interfaces/provider-adapter.interface';
import { resolveProviderFromModel } from './proxy.utils';

@Injectable()
export class ProxyChatService {
  private readonly logger = new Logger(ProxyChatService.name);

  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly apiKeysService: ApiKeysService,
    private readonly providersService: ProvidersService,
    private readonly keySelectorService: KeySelectorService,
    private readonly keyCooldownService: KeyCooldownService,
    @InjectQueue('request-logs') private readonly requestLogsQueue: Queue,
  ) {}

  async executeProxyChatCompletion(
    userId: string,
    body: Record<string, unknown>,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
    group?: string,
  ): Promise<LlmResponse> {
    const model = body.model as string | undefined;
    if (!model) {
      throw new BadRequestException('Model is required in request payload');
    }

    const provider = resolveProviderFromModel(model);
    const isEnabled = await this.providersService.isProviderEnabled(provider);
    if (!isEnabled) {
      throw new ServiceUnavailableException(
        `Provider ${provider} is globally disabled by administration.`,
      );
    }
    const maxAttempts = 3;
    let attempts = 0;
    const errors: unknown[] = [];
    const rotatedFromKeys: string[] = [];
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      
      const key = await this.keySelectorService.selectKey(userId, provider, group, strategy);
      if (!key) {
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

        const response = await adapter.executeChatCompletion(decryptedKey, body);

        await this.apiKeysRepository.update(key.id, {
          successCount: key.successCount + 1,
          lastUsedAt: new Date(),
        });

        const durationMs = Date.now() - startTime;
        const promptTokens = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;

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
      } catch (err: unknown) {
        errors.push(err);
        rotatedFromKeys.push(key.id);
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const errMsg = err instanceof Error ? err.message : 'Unknown provider error';
        
        this.logger.warn(
          `Key ${key.name} (${key.keyMask}) failed with status ${status}: ${errMsg}`,
        );

        await this.keyCooldownService.handleKeyFailure(key, status, errMsg);
      }
    }

    const durationMs = Date.now() - startTime;
    const lastError = errors[errors.length - 1];
    const status = lastError instanceof HttpException ? lastError.getStatus() : 500;
    const errMsg = lastError instanceof Error ? lastError.message : 'Unknown failure';

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
      `All key rotation attempts exhausted. Last error: ${errMsg}`,
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to publish request log job to BullMQ: ${errMsg}`);
    }
  }
}
