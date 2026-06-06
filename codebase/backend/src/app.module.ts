import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './config/env.config';
import { RedisModule } from './cache/redis.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { MonitorModule } from './modules/monitor/monitor.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { DeveloperTokensModule } from './modules/developer-tokens/developer-tokens.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        autoIndex: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        const isTls = redisUrl.startsWith('rediss://');
        try {
          const parsedUrl = new URL(redisUrl);
          return {
            connection: {
              host: parsedUrl.hostname || 'localhost',
              port: parseInt(parsedUrl.port, 10) || 6379,
              password: parsedUrl.password || undefined,
              tls: isTls ? { rejectUnauthorized: false } : undefined,
            },
          };
        } catch {
          return {
            connection: {
              host: 'localhost',
              port: 6379,
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    ApiKeysModule,
    ProvidersModule,
    ProxyModule,
    MonitorModule,
    NotificationsModule,
    AdminModule,
    DeveloperTokensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
