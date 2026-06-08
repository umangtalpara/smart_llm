import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DeveloperToken,
  DeveloperTokenSchema,
} from './schemas/developer-token.schema';
import { DeveloperTokensRepository } from './developer-tokens.repository';
import { DeveloperTokensService } from './developer-tokens.service';
import { DeveloperTokensController } from './developer-tokens.controller';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeveloperToken.name, schema: DeveloperTokenSchema },
    ]),
    UsersModule,
    ApiKeysModule,
  ],
  providers: [DeveloperTokensRepository, DeveloperTokensService],
  controllers: [DeveloperTokensController],
  exports: [DeveloperTokensService],
})
export class DeveloperTokensModule {}
