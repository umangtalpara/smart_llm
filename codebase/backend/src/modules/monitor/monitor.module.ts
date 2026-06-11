import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { LogProcessor } from './processors/log.processor';
import { RequestLog, RequestLogSchema } from './schemas/request-log.schema';
import { UsageStat, UsageStatSchema } from './schemas/usage-stat.schema';
import { ApiKey, ApiKeySchema } from '../api-keys/schemas/api-key.schema';
import { RedisModule } from '../../cache/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequestLog.name, schema: RequestLogSchema },
      { name: UsageStat.name, schema: UsageStatSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
    BullModule.registerQueue({
      name: 'request-logs',
    }),
    RedisModule,
    NotificationsModule,
  ],
  controllers: [MonitorController],
  providers: [MonitorService, LogProcessor],
  exports: [MonitorService],
})
export class MonitorModule {}
