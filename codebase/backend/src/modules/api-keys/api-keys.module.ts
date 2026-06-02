import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { EncryptionService } from './encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysRepository, ApiKeysService, EncryptionService],
  exports: [ApiKeysService, ApiKeysRepository, EncryptionService],
})
export class ApiKeysModule {}
