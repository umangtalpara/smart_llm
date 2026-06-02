import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    ApiKeysModule,
    ProvidersModule,
    BullModule.registerQueue({
      name: 'request-logs',
    }),
  ],
  controllers: [ProxyController],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
