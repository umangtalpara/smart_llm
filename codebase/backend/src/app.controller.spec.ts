import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let mockAppService: Partial<AppService>;

  beforeEach(async () => {
    mockAppService = {
      getWelcomeMessage: () => ({
        message: 'Welcome to the ProxyLLM API Gateway!',
        version: '1.0.0',
        status: 'active',
        docs: '/docs',
        timestamp: new Date().toISOString(),
      }),
      getHealthCheck: () => ({
        status: 'UP',
        database: 'connected',
        timestamp: new Date().toISOString(),
      }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return welcome message', () => {
      expect(appController.getWelcome().message).toBe(
        'Welcome to the ProxyLLM API Gateway!',
      );
    });
  });
});
