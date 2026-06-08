import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AlertProcessor } from './alert.processor';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import {
  UsageStat,
  UsageStatSchema,
} from '../monitor/schemas/usage-stat.schema';
import { ApiKey, ApiKeySchema } from '../api-keys/schemas/api-key.schema';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: UsageStat.name, schema: UsageStatSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
    BullModule.registerQueue({
      name: 'request-logs',
    }),
    RedisModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
