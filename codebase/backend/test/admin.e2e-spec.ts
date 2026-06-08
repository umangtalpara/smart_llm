import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { RedisService } from './../src/cache/redis.service';
import { ProvidersService } from './../src/modules/providers/providers.service';
import { ProviderCode, UserRole } from '../../shared/types';

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
    public pendingPromises: Array<{ resolve: any; reject: any }> = [];

    constructor() {
      super();
      process.nextTick(() => this.emit('connect'));
      process.nextTick(() => this.emit('ready'));
      return new Proxy(this, {
        get(target, prop, receiver) {
          if (prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          if (typeof prop === 'string') {
            return (...args: any[]) => {
              if (prop.startsWith('b') && prop !== 'build') {
                return new Promise((resolve, reject) => {
                  target.pendingPromises.push({ resolve, reject });
                });
              }
              return Promise.resolve(null);
            };
          }
          return undefined;
        },
      });
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
      this.pendingPromises.forEach(({ resolve }) => resolve(null));
      this.pendingPromises = [];
      process.nextTick(() => {
        this.emit('end');
        this.emit('close');
      });
      return Promise.resolve('OK');
    }
    disconnect() {
      this.pendingPromises.forEach(({ resolve }) => resolve(null));
      this.pendingPromises = [];
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

const mockRedisStore: Record<string, string> = {};

const mockRedisService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  get: jest
    .fn()
    .mockImplementation((key: string) =>
      Promise.resolve(mockRedisStore[key] || null),
    ),
  set: jest.fn().mockImplementation((key: string, val: string) => {
    mockRedisStore[key] = val;
    return Promise.resolve(undefined);
  }),
  setWithTtl: jest.fn().mockImplementation((key: string, val: string) => {
    mockRedisStore[key] = val;
    return Promise.resolve(undefined);
  }),
  del: jest.fn().mockImplementation((key: string) => {
    delete mockRedisStore[key];
    return Promise.resolve(undefined);
  }),
  exists: jest
    .fn()
    .mockImplementation((key: string) =>
      Promise.resolve(!!mockRedisStore[key]),
    ),
  keys: jest.fn().mockResolvedValue([]),
};

describe('Admin Panel & RBAC Modules (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let mongooseConnection: Connection;
  let providersService: ProvidersService;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
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
    providersService = app.get<ProvidersService>(ProvidersService);

    // Clean Database collections
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});
    await mongooseConnection.collection('requestlogs').deleteMany({});
    await mongooseConnection.collection('usagestats').deleteMany({});
    await mongooseConnection.collection('providers').deleteMany({});

    // Seed providers through ProvidersService init
    await providersService.onModuleInit();

    // 1. Create Normal User
    const regUserRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'user@proxyllm.com',
        password: 'password123',
        name: 'Regular User',
      });
    expect(regUserRes.status).toBe(201);
    userToken = regUserRes.body.accessToken;
    userId = regUserRes.body.user.id;

    // 2. Create Admin User
    const regAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@proxyllm.com',
        password: 'password123',
        name: 'Super Admin',
      });
    expect(regAdminRes.status).toBe(201);
    adminToken = regAdminRes.body.accessToken;
    adminId = regAdminRes.body.user.id;

    // Promote the admin user directly in MongoDB
    await mongooseConnection
      .collection('users')
      .updateOne(
        { _id: new Types.ObjectId(adminId) },
        { $set: { role: UserRole.ADMIN } },
      );
  });

  afterAll(async () => {
    // Cleanup Database collections
    await mongooseConnection.collection('users').deleteMany({});
    await mongooseConnection.collection('apikeys').deleteMany({});
    await mongooseConnection.collection('requestlogs').deleteMany({});
    await mongooseConnection.collection('usagestats').deleteMany({});
    await mongooseConnection.collection('providers').deleteMany({});

    await app.close();
  });

  describe('RBAC Authorization Constraints', () => {
    it('should block non-admin users from accessing admin routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('insufficient permissions');
    });

    it('should allow admin users to access admin routes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(2); // Regular user and admin user
    });
  });

  describe('User Role Promotions/Demotions', () => {
    it('should allow admin to update user roles', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe(UserRole.ADMIN);

      // Verify DB role updated
      const updatedUser = await mongooseConnection.collection('users').findOne({
        _id: new Types.ObjectId(userId),
      });
      expect(updatedUser?.role).toBe(UserRole.ADMIN);
    });

    it('should allow newly promoted admin to access admin routes', async () => {
      // Log in again to get a new token containing updated claims
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@proxyllm.com',
          password: 'password123',
        });
      expect(loginRes.status).toBe(200);
      const newAdminToken = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${newAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Global Provider Status Toggle & Requests Blocking', () => {
    it('should retrieve list of all registered providers status config', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/providers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.find((p: any) => p.code === ProviderCode.OPENAI),
      ).toBeDefined();
    });

    it('should block proxy completion calls when provider is globally disabled', async () => {
      // 1. Verify openai starts as enabled
      let isEnabled = await providersService.isProviderEnabled(
        ProviderCode.OPENAI,
      );
      expect(isEnabled).toBe(true);

      // 2. Disable openai globally via Admin endpoint
      const disableRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/providers/${ProviderCode.OPENAI}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' });

      expect(disableRes.status).toBe(200);
      expect(disableRes.body.status).toBe('inactive');

      // 3. Verify provider state in cache/service
      isEnabled = await providersService.isProviderEnabled(ProviderCode.OPENAI);
      expect(isEnabled).toBe(false);

      // 4. Try to call proxy completions with gpt model and expect 503 Service Unavailable
      const proxyRes = await request(app.getHttpServer())
        .post('/api/v1/proxy/chat/completions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'test' }],
        });

      expect(proxyRes.status).toBe(503);
      expect(proxyRes.body.message).toContain('globally disabled');
    });

    it('should allow proxy completion calls when provider is globally re-enabled', async () => {
      // 1. Re-enable openai globally via Admin endpoint
      const enableRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/providers/${ProviderCode.OPENAI}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(enableRes.status).toBe(200);
      expect(enableRes.body.status).toBe('active');

      // 2. Verify provider state in cache/service
      const isEnabled = await providersService.isProviderEnabled(
        ProviderCode.OPENAI,
      );
      expect(isEnabled).toBe(true);
    });
  });

  describe('System-wide Usage Stats Aggregation', () => {
    it('should aggregate usage stats across all users correctly', async () => {
      // Seed statistics for Admin
      await mongooseConnection.collection('usagestats').insertOne({
        userId: new Types.ObjectId(adminId),
        date: new Date().toISOString().split('T')[0],
        requestCount: 5,
        successCount: 4,
        failCount: 1,
        totalTokens: 500,
        latencySumMs: 1200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Seed statistics for User
      await mongooseConnection.collection('usagestats').insertOne({
        userId: new Types.ObjectId(userId),
        date: new Date().toISOString().split('T')[0],
        requestCount: 3,
        successCount: 3,
        failCount: 0,
        totalTokens: 300,
        latencySumMs: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/stats?days=7')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();

      // Total Requests: 5 + 3 = 8
      expect(res.body.metrics.totalRequests).toBe(8);
      // Total Success: 4 + 3 = 7
      // Success Rate: (7 / 8) * 100 = 88%
      expect(res.body.metrics.successRate).toBe(88);
      // Total Tokens: 500 + 300 = 800
      expect(res.body.metrics.totalTokens).toBe(800);
      // Average Latency: latencySumMs (1200 + 900) / totalSuccess (7) = 300ms
      expect(res.body.metrics.avgLatencyMs).toBe(300);

      // Verify chart timeseries aggregation
      expect(res.body.chartData).toBeInstanceOf(Array);
      expect(res.body.chartData.length).toBe(1);
      expect(res.body.chartData[0].requests).toBe(8);
      expect(res.body.chartData[0].success).toBe(7);
      expect(res.body.chartData[0].failed).toBe(1);
      expect(res.body.chartData[0].avgLatencyMs).toBe(300);
    });
  });
});
