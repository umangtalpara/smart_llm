import { Module, Global } from '@nestjs/common';
import { DatadogLoggerService } from './datadog-logger.service';

@Global()
@Module({
  providers: [DatadogLoggerService],
  exports: [DatadogLoggerService],
})
export class LoggingModule {}
