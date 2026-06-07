import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getWelcomeMessage() {
    return {
      message: 'Welcome to the ProxyLLM API Gateway!',
      version: '1.0.0',
      status: 'active',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }

  getHealthCheck() {
    const dbStatus = this.connection.readyState === 1 ? 'connected' : 'disconnected';
    return {
      status: 'UP',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}

