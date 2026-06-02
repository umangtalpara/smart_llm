import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ProviderAdapter } from './interfaces/provider-adapter.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GroqAdapter } from './adapters/groq.adapter';
import { ProviderCode } from '../../../../shared/types';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly adapters = new Map<ProviderCode, ProviderAdapter>();

  constructor(
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly geminiAdapter: GeminiAdapter,
    private readonly claudeAdapter: ClaudeAdapter,
    private readonly groqAdapter: GroqAdapter,
  ) {
    // Register adapters
    this.adapters.set(ProviderCode.OPENAI, this.openaiAdapter);
    this.adapters.set(ProviderCode.GEMINI, this.geminiAdapter);
    this.adapters.set(ProviderCode.CLAUDE, this.claudeAdapter);
    this.adapters.set(ProviderCode.GROQ, this.groqAdapter);
    
    this.logger.log(`Registered ${this.adapters.size} provider adapters successfully.`);
  }

  getAdapter(provider: ProviderCode): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new NotFoundException(`No provider adapter registered for ${provider}`);
    }
    return adapter;
  }

  getSupportedProviders(): ProviderCode[] {
    return Array.from(this.adapters.keys());
  }
}
