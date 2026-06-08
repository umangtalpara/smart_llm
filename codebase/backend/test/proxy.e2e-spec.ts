import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpException, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { OpenAIAdapter } from './../src/modules/providers/adapters/openai.adapter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './../src/cache/redis.service';
import { RotationStrategy, ProviderCode } from '../../shared/types';

jest.mock('@nestjs/bullmq', () => {
  class MockWorkerHost {}
  return {
    InjectQueue: (name: string) => {
      return (target: any, key: string | symbol, index?: number) => {
        const { Inject } = require('@nestjs/common');
        return Inject(`BullQueue_${name}`)(target, key, index!);
      };
    },
    Processor: () => (target: any) => {},
    Process: () => (target: any, key: string | symbol, descriptor: any) =>
      descriptor,
    WorkerHost: MockWorkerHost,
    BullModule: {
      forRoot: () => ({
        module: class {},
        providers: [],
        exports: [],
      }),
      forRootAsync: () => ({
        module: class {},
        providers: [],
        exports: [],
      }),
      registerQueue: () => ({
        module: class {},
        providers: [
          {
            provide: 'BullQueue_request-logs',
            useValue: {
              add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
              close: jest.fn().mockResolvedValue(null),
            },
          },
        ],
        exports: ['BullQueue_request-logs'],
      }),
      registerQueueAsync: () => ({
        module: class {},
        providers: [
          {
            provide: 'BullQueue_request-logs',
            useValue: {
              add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
              close: jest.fn().mockResolvedValue(null),
            },
          },
        ],
        exports: ['BullQueue_request-logs'],
      }),
    },
  };
});

// Mock ioredis completely to prevent BullMQ connection attempts in E2E tests
jest.mock('ioredis', () => {
  const EventEmitter = require('events');
  class MockRedis extends EventEmitter {
    constructor() {
      super();
      process.nextTick(() => this.emit('connect'));
      process.nextTick(() => this.emit('ready'));
    }
    options = { connectionName: 'mock-bullmq' };
    status = 'ready';
    info() {
      return Promise.resolve('redis_version:7.0.0');
    }
    multi() {
      return {
        exec: () => Promise.resolve([]),
      };
    }
    defineCommand(name: string, options: any) {
      (this as any)[name] = jest.fn().mockResolvedValue(null);
    }
    client() {
      return Promise.resolve('OK');
    }
    quit() {
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
      return Promise.resolve('OK');
    }
    disconnect() {
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
    }
    off() {}
  }
  (MockRedis as any).default = MockRedis;
  return MockRedis;
});

jest.mock('ioredis/built/Redis', () => {
  return jest.requireMock('ioredis');
});

// Mock OpenAI adapter to simulate different key responses
const mockOpenAIAdapter = {
  getProviderCode: () => 'openai',
  validateKey: jest.fn().mockResolvedValue(true),
  executeChatCompletion: jest
    .fn()
    .mockImplementation(async (apiKey: string, body: any) => {
      if (apiKey === 'invalid-key') {
        throw new HttpException(
          'Invalid API Key credentials',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (apiKey === 'rate-limited-key') {
        throw new HttpException(
          'Rate limit reached',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return {
        id: 'chatcmpl-mock-id',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Mocked reply for key: ${apiKey}`,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };
    }),
  executeEmbeddings: jest
    .fn()
    .mockImplementation(async (apiKey: string, body: any) => {
      if (apiKey === 'rate-limited-key') {
        throw new HttpException(
          'Rate limit reached',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.0023, -0.012, 0.985],
          },
        ],
        model: body.model,
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };
    }),
};

const mockRedisData = new Map<string, string>();

const mockRedisService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockImplementation(async (key: string) => {
    return mockRedisData.get(key) || null;
  }),
  set: jest.fn().mockImplementation(async (key: string, value: string) => {
    mockRedisData.set(key, value);
  }),
  setWithTtl: jest
    .fn()
    .mockImplementation(
      async (key: string, value: string, ttlSeconds: number) => {
        mockRedisData.set(key, value);
      },
    ),
  del: jest.fn().mockImplementation(async (key: string) => {
    mockRedisData.delete(key);
  }),
  exists: jest.fn().mockImplementation(async (key: string) => {
    return mockRedisData.has(key);
  }),
  keys: jest.fn().mockImplementation(async (pattern: string) => {
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(mockRedisData.keys()).filter((k) => regexPattern.test(k));
  }),
};

describe('ProxyLLM Gateway Engine (e2e)', () => {
  let app: INestApplication<App>;
  let mongooseConnection: Connection;
  let redisService: RedisService;
  let jwtToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenAIAdapter)
      .useValue(mockOpenAIAdapter)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    redisService = app.get<RedisService>(RedisService);

    // Clean DB
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});

    // 1. Register a test user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'tester@proxyllm.com',
        password: 'password123',
        name: 'Proxy Tester',
      });

    expect(regRes.status).toBe(201);

    // 2. Login to obtain access token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'tester@proxyllm.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(200);
    jwtToken = loginRes.body.accessToken;
    userId = loginRes.body.user.id;
  });

  afterAll(async () => {
    // Cleanup Mongoose & Redis
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});

    // Clear index caching in Redis
    const keys = await redisService.keys('user:*');
    for (const key of keys) {
      await redisService.del(key);
    }
    const cooldowns = await redisService.keys('key:cooldown:*');
    for (const key of cooldowns) {
      await redisService.del(key);
    }

    await app.close();
  });

  beforeEach(async () => {
    // Clear API keys and cooldowns before each test case to make tests perfectly isolated
    await mongooseConnection.collection('apikeys').deleteMany({});
    const keys = await redisService.keys('user:*');
    for (const key of keys) {
      await redisService.del(key);
    }
    const cooldowns = await redisService.keys('key:cooldown:*');
    for (const key of cooldowns) {
      await redisService.del(key);
    }
  });

  describe('Priority-based Rotation', () => {
    it('should select the key with the highest priority first', async () => {
      // Seed 2 active OpenAI keys
      // Key A: priority 5
      // Key B: priority 10
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Key A (Low Priority)',
          apiKey: 'low-prio-secret-key-1',
          priority: 5,
        });

      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Key B (High Priority)',
          apiKey: 'high-prio-secret-key-2',
          priority: 10,
        });

      // Call Completions Endpoint
      const res = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-rotation-strategy', RotationStrategy.PRIORITY)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        });

      expect(res.status).toBe(200);
      // High priority key (Key B) should be used
      expect(res.body.choices[0].message.content).toContain(
        'high-prio-secret-key-2',
      );
    });
  });

  describe('Round-Robin Strategy', () => {
    it('should cycle through all equal-priority keys sequentially', async () => {
      // Seed 2 active OpenAI keys with equal priority
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Key A',
          apiKey: 'round-robin-key-1',
          priority: 5,
        });

      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Key B',
          apiKey: 'round-robin-key-2',
          priority: 5,
        });

      // Request 1
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-rotation-strategy', RotationStrategy.ROUND_ROBIN)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        });

      // Request 2
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-rotation-strategy', RotationStrategy.ROUND_ROBIN)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const val1 = res1.body.choices[0].message.content;
      const val2 = res2.body.choices[0].message.content;

      // They should rotate and be different keys
      expect(val1).not.toEqual(val2);
      expect([val1, val2]).toContain('Mocked reply for key: round-robin-key-1');
      expect([val1, val2]).toContain('Mocked reply for key: round-robin-key-2');
    });
  });

  describe('Failover & Redis Cooldown Mechanics', () => {
    it('should temporarily cool down a key returning a 429 and transparently retry with the next key', async () => {
      // Seed two keys:
      // Key A (Rate Limited): priority 10
      // Key B (Healthy): priority 5
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Rate Limited Key',
          apiKey: 'rate-limited-key',
          priority: 10,
        });

      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Healthy backup Key',
          apiKey: 'healthy-backup-key-1',
          priority: 5,
        });

      // Execute request: it should first try Rate Limited Key (priority 10), get 429,
      // place it on cooldown in Redis and database, failover to Key B (priority 5) and succeed.
      const res = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.choices[0].message.content).toContain(
        'healthy-backup-key-1',
      );

      // Verify that 'rate-limited-key' is now locked in Redis cooldown
      const keysInDb = await mongooseConnection
        .collection('apikeys')
        .find({})
        .toArray();
      const rateLimitedDbKey = keysInDb.find(
        (k) => k.name === 'Rate Limited Key',
      );

      expect(rateLimitedDbKey).toBeDefined();
      expect(rateLimitedDbKey.cooldownUntil).toBeDefined();
      expect(
        new Date(rateLimitedDbKey.cooldownUntil).getTime(),
      ).toBeGreaterThan(Date.now());

      const redisCooldownKey = `key:cooldown:${rateLimitedDbKey._id}`;
      const isRedisCooldownActive = await redisService.exists(redisCooldownKey);
      expect(isRedisCooldownActive).toBe(true);
    });

    it('should permanently deactivate (INACTIVE) a key returning a 401 Unauthorized', async () => {
      // Seed two keys:
      // Key A (Invalid): priority 10
      // Key B (Healthy): priority 5
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Invalid Key',
          apiKey: 'invalid-key',
          priority: 10,
        });

      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Healthy backup Key',
          apiKey: 'healthy-backup-key-2',
          priority: 5,
        });

      // Execute completions call
      const res = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.choices[0].message.content).toContain(
        'healthy-backup-key-2',
      );

      // Verify the invalid key has been set to INACTIVE in the database
      const keysInDb = await mongooseConnection
        .collection('apikeys')
        .find({})
        .toArray();
      const invalidDbKey = keysInDb.find((k) => k.name === 'Invalid Key');
      expect(invalidDbKey).toBeDefined();
      expect(invalidDbKey.status).toBe('inactive');
    });
  });

  describe('Unified Embeddings Endpoint', () => {
    it('should execute embeddings and rotate keys', async () => {
      // Seed an active OpenAI Key
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          provider: 'openai',
          name: 'Embeddings Key',
          apiKey: 'embeddings-test-key',
          priority: 10,
        });

      // Post embeddings request
      const res = await request(app.getHttpServer())
        .post('/api/v1/proxy/embeddings')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          model: 'text-embedding-3-small',
          input: 'The quick brown fox jumps over the lazy dog',
        });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(res.body.data[0].embedding).toEqual([0.0023, -0.012, 0.985]);
    });
  });

  describe('Unified Models Endpoint', () => {
    it('should return a list of all supported models', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/proxy/models')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(res.body.data).toBeInstanceOf(Array);

      const modelIds = res.body.data.map((m: any) => m.id);
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('gemini-1.5-flash');
      expect(modelIds).toContain('claude-3-5-sonnet');
      expect(modelIds).toContain('llama3-8b-8192');
    });
  });
});
