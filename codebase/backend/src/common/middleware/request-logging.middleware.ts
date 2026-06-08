import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatadogLoggerService } from '../logging/datadog-logger.service';
import * as crypto from 'crypto';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: DatadogLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Inject requestId into request object for context propagation
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';

    // Log request initiation
    const sanitizedHeaders = this.sanitizeHeaders(req.headers);
    const sanitizedBody = this.sanitizeBody(req.body);

    this.logger.log(
      `Incoming Request: ${method} ${originalUrl}`,
      {
        http: {
          method,
          url: originalUrl,
          useragent: userAgent,
          client_ip: ip,
          request_id: requestId,
        },
        request: {
          headers: sanitizedHeaders,
          body: sanitizedBody,
        },
      },
      'RequestLoggingMiddleware',
    );

    // Track response finish
    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const responseLogData = {
        http: {
          method,
          url: originalUrl,
          useragent: userAgent,
          client_ip: ip,
          request_id: requestId,
          status_code: statusCode,
          duration: durationMs,
        },
      };

      const message = `Completed Request: ${method} ${originalUrl} ${statusCode} in ${durationMs}ms`;

      if (statusCode >= 500) {
        this.logger.error(
          message,
          undefined,
          'RequestLoggingMiddleware',
          responseLogData,
        );
      } else if (statusCode >= 400) {
        this.logger.warn(message, 'RequestLoggingMiddleware', responseLogData);
      } else {
        this.logger.log(message, 'RequestLoggingMiddleware', responseLogData);
      }
    });

    next();
  }

  private sanitizeHeaders(
    headers: Record<string, any>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('authorization') ||
        lowerKey.includes('key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('cookie')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = Array.isArray(value)
          ? value.join(', ')
          : String(value);
      }
    }
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    // Deep clone to avoid mutating original request body
    let sanitized: any;
    try {
      sanitized = JSON.parse(JSON.stringify(body));
    } catch {
      return '[UNPARSABLE BODY]';
    }

    const sensitiveKeys = [
      'password',
      'apikey',
      'secret',
      'token',
      'key',
      'credential',
      'jwt',
    ];

    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string' && obj[key].length > 1000) {
          obj[key] = obj[key].substring(0, 1000) + '... [TRUNCATED]';
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
