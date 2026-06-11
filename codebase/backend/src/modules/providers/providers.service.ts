import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderAdapter } from './interfaces/provider-adapter.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GroqAdapter } from './adapters/groq.adapter';
import { GrokAdapter } from './adapters/grok.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { MistralAdapter } from './adapters/mistral.adapter';
import { CerebrasAdapter } from './adapters/cerebras.adapter';
import { CambercloudAdapter } from './adapters/cambercloud.adapter';
import { GithubAdapter } from './adapters/github.adapter';
import { Provider, ProviderDocument } from './schemas/provider.schema';
import { RedisService } from '../../cache/redis.service';
import { ProviderCode } from '../../../../shared/types';

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);
  private readonly adapters = new Map<ProviderCode, ProviderAdapter>();

  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    private readonly redisService: RedisService,
    private readonly openaiAdapter: OpenAIAdapter,
    private readonly geminiAdapter: GeminiAdapter,
    private readonly claudeAdapter: ClaudeAdapter,
    private readonly groqAdapter: GroqAdapter,
    private readonly grokAdapter: GrokAdapter,
    private readonly openRouterAdapter: OpenRouterAdapter,
    private readonly mistralAdapter: MistralAdapter,
    private readonly cerebrasAdapter: CerebrasAdapter,
    private readonly cambercloudAdapter: CambercloudAdapter,
    private readonly githubAdapter: GithubAdapter,
  ) {
    // Register adapters
    this.adapters.set(ProviderCode.OPENAI, this.openaiAdapter);
    this.adapters.set(ProviderCode.GEMINI, this.geminiAdapter);
    this.adapters.set(ProviderCode.CLAUDE, this.claudeAdapter);
    this.adapters.set(ProviderCode.GROQ, this.groqAdapter);
    this.adapters.set(ProviderCode.GROK, this.grokAdapter);
    this.adapters.set(ProviderCode.OPENROUTER, this.openRouterAdapter);
    this.adapters.set(ProviderCode.MISTRAL, this.mistralAdapter);
    this.adapters.set(ProviderCode.CEREBRAS, this.cerebrasAdapter);
    this.adapters.set(ProviderCode.CAMBERCLOUD, this.cambercloudAdapter);
    this.adapters.set(ProviderCode.GITHUB, this.githubAdapter);

    this.logger.log(
      `Registered ${this.adapters.size} provider adapters successfully.`,
    );
  }

  async onModuleInit() {
    try {
      await this.seedProviders();
      await this.syncRedisStatus();
    } catch (err: any) {
      this.logger.error(
        `Failed to initialize providers database and cache: ${err.message}`,
        err.stack,
      );
    }
  }

  private async seedProviders() {
    const supported = [
      {
        name: 'OpenAI',
        code: ProviderCode.OPENAI,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Google Gemini',
        code: ProviderCode.GEMINI,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Anthropic Claude',
        code: ProviderCode.CLAUDE,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Groq',
        code: ProviderCode.GROQ,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'xAI Grok',
        code: ProviderCode.GROK,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'OpenRouter',
        code: ProviderCode.OPENROUTER,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Mistral AI',
        code: ProviderCode.MISTRAL,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Cerebras',
        code: ProviderCode.CEREBRAS,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'Cambercloud',
        code: ProviderCode.CAMBERCLOUD,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
      {
        name: 'GitHub Models',
        code: ProviderCode.GITHUB,
        defaultRpmLimit: 10000,
        defaultTpmLimit: 1000000,
      },
    ];

    for (const p of supported) {
      const exists = await this.providerModel.findOne({ code: p.code });
      if (!exists) {
        await this.providerModel.create({
          name: p.name,
          code: p.code,
          status: 'active',
          defaultRpmLimit: p.defaultRpmLimit,
          defaultTpmLimit: p.defaultTpmLimit,
        });
        this.logger.log(`Seeded provider config for ${p.name}`);
      }
    }
  }

  private async syncRedisStatus() {
    const providers = await this.providerModel.find({});
    for (const p of providers) {
      const redisKey = `provider:disabled:${p.code}`;
      if (p.status === 'inactive') {
        await this.redisService.set(redisKey, 'true');
      } else {
        await this.redisService.del(redisKey);
      }
    }
    this.logger.log('Synced globally disabled providers to Redis.');
  }

  async isProviderEnabled(provider: ProviderCode): Promise<boolean> {
    const redisKey = `provider:disabled:${provider}`;
    const isDisabled = await this.redisService.get(redisKey);
    return isDisabled !== 'true';
  }

  async getAllProviders() {
    return this.providerModel.find({});
  }

  async updateProviderStatus(
    provider: ProviderCode,
    status: 'active' | 'inactive',
  ) {
    const doc = await this.providerModel.findOneAndUpdate(
      { code: provider },
      { $set: { status } },
      { new: true },
    );
    if (!doc) {
      throw new NotFoundException(`Provider ${provider} not found`);
    }

    const redisKey = `provider:disabled:${provider}`;
    if (status === 'inactive') {
      await this.redisService.set(redisKey, 'true');
    } else {
      await this.redisService.del(redisKey);
    }

    this.logger.log(`Global status for provider ${provider} set to ${status}.`);
    return doc;
  }

  getAdapter(provider: ProviderCode): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new NotFoundException(
        `No provider adapter registered for ${provider}`,
      );
    }
    return adapter;
  }

  getSupportedProviders(): ProviderCode[] {
    return Array.from(this.adapters.keys());
  }
}
