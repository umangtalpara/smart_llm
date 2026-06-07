import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Security headers (compatible with Swagger UI local asset loads)
  app.use(
    helmet.default({
      contentSecurityPolicy: false, // Disabled for local Swagger UI usage
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: '*', // In production, replace with specific domains
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefixes and filters
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Global DTO pipes validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ProxyLLM API')
    .setDescription('Smart Multi-tenant AI Key Rotation & Unified Proxy API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.init();

  if (process.env.VERCEL !== '1') {
    await app.listen(port);
    logger.log(`ProxyLLM Backend is running on: http://localhost:${port}/api/v1`);
    logger.log(`API Documentation is available at: http://localhost:${port}/docs`);
  }

  return app;
}

// Support Vercel serverless deployment
let server: any;
export default async (req: any, res: any) => {
  if (!server) {
    const app = await bootstrap();
    server = app.getHttpAdapter().getInstance();
  }
  return server(req, res);
};

