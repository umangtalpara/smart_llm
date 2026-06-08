import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DatadogLoggerService } from '../logging/datadog-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: DatadogLoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const resContent = exception.getResponse() as any;
      if (typeof resContent === 'object') {
        message = resContent.message || exception.message;
        error = resContent.error || exception.name;
      } else {
        message = resContent || exception.message;
      }
    } else {
      message = exception.message || 'An unexpected error occurred';
    }

    const logData = {
      http: {
        statusCode: status,
        url: request.url,
        method: request.method,
        request_id: requestId,
      },
      error: {
        message,
        kind:
          exception.name ||
          (exception instanceof Error
            ? exception.constructor.name
            : 'UnhandledException'),
        stack: exception.stack,
      },
    };

    if (status >= 500) {
      this.logger.error(
        `Unhandled Exception: ${message} at path: ${request.method} ${request.url}`,
        exception.stack,
        'HttpExceptionFilter',
        logData,
      );
    } else {
      this.logger.warn(
        `HTTP Exception ${status}: ${message} at path: ${request.method} ${request.url}`,
        'HttpExceptionFilter',
        logData,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message, // Standardize to first error message if array
      error,
    });
  }
}
