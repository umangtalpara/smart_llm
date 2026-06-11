import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { RedisService } from './../src/cache/redis.service';

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

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Welcome to the ProxyLLM API Gateway!');
        expect(res.body.version).toBe('1.0.0');
        expect(res.body.status).toBe('active');
        expect(res.body.docs).toBe('/docs');
        expect(res.body.timestamp).toBeDefined();
      });
  });
});
