import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvidersService } from './providers.service';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GroqAdapter } from './adapters/groq.adapter';
import { GrokAdapter } from './adapters/grok.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { MistralAdapter } from './adapters/mistral.adapter';
import { CerebrasAdapter } from './adapters/cerebras.adapter';
import { CambercloudAdapter } from './adapters/cambercloud.adapter';
import { Provider, ProviderSchema } from './schemas/provider.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Provider.name, schema: ProviderSchema },
    ]),
  ],
  providers: [
    ProvidersService,
    OpenAIAdapter,
    GeminiAdapter,
    ClaudeAdapter,
    GroqAdapter,
    GrokAdapter,
    OpenRouterAdapter,
    MistralAdapter,
    CerebrasAdapter,
    CambercloudAdapter,
  ],
  exports: [
    ProvidersService,
    OpenAIAdapter,
    GeminiAdapter,
    ClaudeAdapter,
    GroqAdapter,
    GrokAdapter,
    OpenRouterAdapter,
    MistralAdapter,
    CerebrasAdapter,
    CambercloudAdapter,
    MongooseModule,
  ],
})
export class ProvidersModule {}
