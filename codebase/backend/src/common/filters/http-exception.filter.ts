import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
      // Log unhandled non-HttpExceptions (actual bugs/crashes)
      message = exception.message || 'An unexpected error occurred';
      this.logger.error(
        `Unhandled Exception: ${message} at path: ${request.url}`,
        exception.stack,
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
