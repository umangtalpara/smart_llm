import { Module, Global } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GroqAdapter } from './adapters/groq.adapter';

@Global()
@Module({
  providers: [
    ProvidersService,
    OpenAIAdapter,
    GeminiAdapter,
    ClaudeAdapter,
    GroqAdapter,
  ],
  exports: [
    ProvidersService,
    OpenAIAdapter,
    GeminiAdapter,
    ClaudeAdapter,
    GroqAdapter,
  ],
})
export class ProvidersModule {}
