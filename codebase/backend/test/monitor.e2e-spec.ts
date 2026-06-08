import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { RedisService } from './../src/cache/redis.service';
import { LogProcessor } from './../src/modules/monitor/processors/log.processor';
import { ProviderCode } from '../../shared/types';
import { Job } from 'bullmq';

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

const mockRedisService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  setWithTtl: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  keys: jest.fn().mockResolvedValue([]),
};

describe('Monitor & Analytics Module (e2e)', () => {
  let app: INestApplication<App>;
  let mongooseConnection: Connection;
  let logProcessor: LogProcessor;
  let jwtToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());
    logProcessor = app.get<LogProcessor>(LogProcessor);

    // Clean DB
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});
    await mongooseConnection.collection('requestlogs').deleteMany({});
    await mongooseConnection.collection('usagestats').deleteMany({});

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'analyst@proxyllm.com',
        password: 'password123',
        name: 'Proxy Analyst',
      });

    expect(regRes.status).toBe(201);

    // Login user
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'analyst@proxyllm.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(200);
    jwtToken = loginRes.body.accessToken;
    userId = loginRes.body.user.id;
  });

  afterAll(async () => {
    // Cleanup Mongoose
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});
    await mongooseConnection.collection('requestlogs').deleteMany({});
    await mongooseConnection.collection('usagestats').deleteMany({});

    await app.close();
  });

  describe('LogProcessor Background Consumer', () => {
    it('should successfully save request log and atomically aggregate usage statistics', async () => {
      // Mock a BullMQ Job payload
      const mockJob = {
        id: 'job-123',
        name: 'log-request',
        data: {
          userId,
          apiKeyId: '60c72b2f9b1d8b2a3c4d5e6f', // Mock object ID
          provider: ProviderCode.OPENAI,
          model: 'gpt-4o',
          path: '/chat/completions',
          durationMs: 250,
          statusCode: 200,
          promptTokens: 15,
          completionTokens: 35,
          totalTokens: 50,
          rotatedFromKeys: [],
        },
      } as unknown as Job;

      // Invoke processor directly
      await logProcessor.process(mockJob);

      // Verify log was saved in RequestLog collection
      const logs = await mongooseConnection
        .collection('requestlogs')
        .find({ userId: new Types.ObjectId(userId) })
        .toArray();
      expect(logs.length).toBe(1);
      expect(logs[0].model).toBe('gpt-4o');
      expect(logs[0].durationMs).toBe(250);
      expect(logs[0].statusCode).toBe(200);

      // Verify aggregate stat was updated in UsageStat collection
      const stats = await mongooseConnection
        .collection('usagestats')
        .find({ userId: new Types.ObjectId(userId) })
        .toArray();
      expect(stats.length).toBe(1);
      expect(stats[0].requestCount).toBe(1);
      expect(stats[0].successCount).toBe(1);
      expect(stats[0].totalTokens).toBe(50);
      expect(stats[0].latencySumMs).toBe(250);
    });

    it('should aggregate failed logs into usage statistics correctly', async () => {
      // Mock a failed completions Job
      const mockJob = {
        id: 'job-456',
        name: 'log-request',
        data: {
          userId,
          provider: ProviderCode.GEMINI,
          model: 'gemini-1.5-flash',
          path: '/chat/completions',
          durationMs: 500,
          statusCode: 429,
          errorMsg: 'Rate Limit Reached',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          rotatedFromKeys: ['60c72b2f9b1d8b2a3c4d5e6f'],
        },
      } as unknown as Job;

      await logProcessor.process(mockJob);

      // Verify aggregate stat counts
      const stats = await mongooseConnection
        .collection('usagestats')
        .find({ userId: new Types.ObjectId(userId) })
        .toArray();
      expect(stats.length).toBe(1);
      // Daily aggregates should now combine: 1 success (250ms) + 1 fail (500ms) = 2 total requests
      expect(stats[0].requestCount).toBe(2);
      expect(stats[0].successCount).toBe(1);
      expect(stats[0].failCount).toBe(1);
      expect(stats[0].latencySumMs).toBe(250);
    });
  });

  describe('REST Analytics APIs', () => {
    it('GET /monitor/metrics should return aggregated widget counters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/monitor/metrics')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalRequests).toBe(2);
      expect(res.body.successRate).toBe(50); // 1 success out of 2 requests = 50%
      expect(res.body.activeKeys).toBe(0); // No keys seeded yet
      expect(res.body.totalTokens).toBe(50);
    });

    it('GET /monitor/charts should return Recharts-formatted timeseries dataset', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/monitor/charts')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1); // Today's record

      const todayRecord = res.body[0];
      expect(todayRecord.requests).toBe(2);
      expect(todayRecord.success).toBe(1);
      expect(todayRecord.failed).toBe(1);
      expect(todayRecord.tokens).toBe(50);
      expect(todayRecord.avgLatencyMs).toBe(250); // latencySumMs (250) / successCount (1) = 250ms
    });

    it('GET /monitor/logs should retrieve paginated logs list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/monitor/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.data.length).toBe(2);

      // Sorted by createdAt desc (newest first - Gemini)
      expect(res.body.data[0].provider).toBe(ProviderCode.GEMINI);
      expect(res.body.data[0].statusCode).toBe(429);
      expect(res.body.data[0].errorMsg).toBe('Rate Limit Reached');
      expect(res.body.data[0].rotatedFromKeys).toContain(
        '60c72b2f9b1d8b2a3c4d5e6f',
      );

      // Second log (oldest first - OpenAI)
      expect(res.body.data[1].provider).toBe(ProviderCode.OPENAI);
      expect(res.body.data[1].statusCode).toBe(200);
    });

    it('GET /monitor/health should return provider active key status map', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/monitor/health')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.openai).toBeDefined();
      expect(res.body.openai.status).toBe('inactive'); // No openai keys seeded
      expect(res.body.openai.label).toBe('No Keys Registered');
    });
  });
});
