import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { ProvidersModule } from '../providers/providers.module';
import { UsageStat, UsageStatSchema } from '../monitor/schemas/usage-stat.schema';
import { ApiKey, ApiKeySchema } from '../api-keys/schemas/api-key.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageStat.name, schema: UsageStatSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
    UsersModule,
    ProvidersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
