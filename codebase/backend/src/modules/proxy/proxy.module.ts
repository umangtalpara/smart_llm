import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProvidersModule } from '../providers/providers.module';
import { DeveloperTokensModule } from '../developer-tokens/developer-tokens.module';
import { KeySelectorService } from './key-selector.service';
import { KeyCooldownService } from './key-cooldown.service';
import { ProxyChatService } from './proxy-chat.service';
import { ProxyEmbeddingsService } from './proxy-embeddings.service';

@Module({
  imports: [
    ApiKeysModule,
    ProvidersModule,
    DeveloperTokensModule,
    BullModule.registerQueue({
      name: 'request-logs',
    }),
  ],
  controllers: [ProxyController],
  providers: [
    ProxyService,
    KeySelectorService,
    KeyCooldownService,
    ProxyChatService,
    ProxyEmbeddingsService,
  ],
  exports: [
    ProxyService,
    KeySelectorService,
    KeyCooldownService,
    ProxyChatService,
    ProxyEmbeddingsService,
  ],
})
export class ProxyModule {}
