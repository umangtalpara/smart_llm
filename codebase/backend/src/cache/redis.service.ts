import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            // Stop retrying to prevent blocking/hanging
            return false;
          }
          return 1000; // Retry after 1 second
        }
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis client connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client successfully connected');
    });

    try {
      await this.client.connect();
    } catch (err: any) {
      this.logger.warn(`Could not establish initial connection to Redis: ${err.message}. Running in degraded mode without cache.`);
    }
  }

  async onModuleDestroy() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.logger.log('Redis client connection closed cleanly');
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err: any) {
      this.logger.error(`Failed to GET key ${key} from Redis: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.client.set(key, value);
    } catch (err: any) {
      this.logger.error(`Failed to SET key ${key} in Redis: ${err.message}`);
    }
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setEx(key, ttlSeconds, value);
    } catch (err: any) {
      this.logger.error(`Failed to SETEX key ${key} in Redis: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.error(`Failed to DEL key ${key} from Redis: ${err.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const count = await this.client.exists(key);
      return count > 0;
    } catch (err: any) {
      this.logger.error(`Failed to CHECK EXISTS of key ${key} in Redis: ${err.message}`);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (err: any) {
      this.logger.error(`Failed to FETCH KEYS with pattern ${pattern} from Redis: ${err.message}`);
      return [];
    }
  }
}
