import { Injectable } from '@nestjs/common';
import { RotationStrategy } from '../../../../shared/types';
import { ProxyChatService } from './proxy-chat.service';
import { ProxyEmbeddingsService } from './proxy-embeddings.service';
import { LlmResponse } from '../providers/interfaces/provider-adapter.interface';
import { getSupportedModels } from './proxy.utils';

@Injectable()
export class ProxyService {
  constructor(
    private readonly proxyChatService: ProxyChatService,
    private readonly proxyEmbeddingsService: ProxyEmbeddingsService,
  ) {}

  async executeProxyChatCompletion(
    userId: string,
    body: Record<string, unknown>,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
    group?: string,
  ): Promise<LlmResponse> {
    return this.proxyChatService.executeProxyChatCompletion(
      userId,
      body,
      strategy,
      group,
    );
  }

  async executeProxyEmbeddings(
    userId: string,
    body: Record<string, unknown>,
    strategy: RotationStrategy = RotationStrategy.PRIORITY,
    group?: string,
  ): Promise<LlmResponse> {
    return this.proxyEmbeddingsService.executeProxyEmbeddings(
      userId,
      body,
      strategy,
      group,
    );
  }

  getSupportedModels() {
    return getSupportedModels();
  }
}
