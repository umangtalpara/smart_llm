import { Injectable, LoggerService } from '@nestjs/common';
import * as https from 'https';
import * as os from 'os';

@Injectable()
export class DatadogLoggerService implements LoggerService {
  private readonly apiKey: string;
  private readonly ddSite: string;
  private readonly serviceName: string;
  private readonly envName: string;
  private readonly version: string;
  private readonly logsEnabled: boolean;
  private readonly hostname: string;
  private readonly isDev: boolean;

  private queue: any[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 10;
  private readonly flushIntervalMs = 2000;

  constructor() {
    this.apiKey = process.env.DD_API_KEY || '';
    this.ddSite = process.env.DD_SITE || 'datadoghq.com';
    this.serviceName = process.env.DD_SERVICE || 'smart-llm-backend';
    const nodeEnv = process.env.NODE_ENV || 'development';
    this.envName = process.env.DD_ENV || nodeEnv;
    this.version = process.env.DD_VERSION || '1.0.0';
    this.logsEnabled = process.env.DD_LOGS_ENABLED !== 'false' && !!this.apiKey;
    this.hostname = os.hostname();
    this.isDev = nodeEnv === 'development';
  }

  log(message: any, ...optionalParams: any[]) {
    this.handleLog('info', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.handleLog('error', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.handleLog('warn', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.handleLog('debug', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.handleLog('verbose', message, optionalParams);
  }

  private handleLog(level: string, message: any, optionalParams: any[]) {
    const { logMessage, context, stack, metadata } = this.parseArgs(
      message,
      optionalParams,
      level,
    );
    const timestamp = new Date().toISOString();

    // 1. Output to local console
    this.printToConsole(timestamp, level, logMessage, context, stack, metadata);

    // 2. Queue for Datadog shipping
    if (this.logsEnabled) {
      this.queueLog({
        timestamp,
        level,
        message: logMessage,
        context,
        stack,
        metadata,
      });
    }
  }

  private parseArgs(message: any, optionalParams: any[], level: string) {
    let logMessage = message;
    let context = '';
    let stack = '';
    let metadata: Record<string, any> = {};

    if (message instanceof Error) {
      logMessage = message.message;
      stack = message.stack || '';
      metadata = {
        error: {
          message: message.message,
          stack: message.stack,
          kind: message.name,
        },
      };
    } else if (typeof message === 'object') {
      metadata = { ...message };
      logMessage = message.message || JSON.stringify(message);
    }

    if (optionalParams.length > 0) {
      if (level === 'error') {
        // NestJS error signature: error(message, stack, context) or error(message, stack)
        if (typeof optionalParams[0] === 'string') {
          stack = optionalParams[0];
        } else if (optionalParams[0] instanceof Error) {
          stack = optionalParams[0].stack || '';
          metadata.error = {
            message: optionalParams[0].message,
            stack: optionalParams[0].stack,
            kind: optionalParams[0].name,
          };
        }

        if (typeof optionalParams[1] === 'string') {
          context = optionalParams[1];
        } else if (optionalParams[1] && typeof optionalParams[1] === 'object') {
          metadata = { ...metadata, ...optionalParams[1] };
        }

        // Catch additional metadata objects
        for (let i = 2; i < optionalParams.length; i++) {
          if (optionalParams[i] && typeof optionalParams[i] === 'object') {
            metadata = { ...metadata, ...optionalParams[i] };
          }
        }
      } else {
        // NestJS log signature: log(message, context) or log(message, metadata, context)
        const lastParam = optionalParams[optionalParams.length - 1];
        if (typeof lastParam === 'string') {
          context = lastParam;
          for (let i = 0; i < optionalParams.length - 1; i++) {
            if (optionalParams[i] && typeof optionalParams[i] === 'object') {
              metadata = { ...metadata, ...optionalParams[i] };
            }
          }
        } else {
          for (const param of optionalParams) {
            if (param && typeof param === 'object') {
              metadata = { ...metadata, ...param };
            } else if (typeof param === 'string') {
              context = param;
            }
          }
        }
      }
    }

    return { logMessage, context, stack, metadata };
  }

  private printToConsole(
    timestamp: string,
    level: string,
    message: string,
    context: string,
    stack: string,
    metadata: Record<string, any>,
  ) {
    if (this.isDev) {
      const colors = {
        reset: '\x1b[0m',
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        debug: '\x1b[35m', // Magenta
        verbose: '\x1b[36m', // Cyan
        context: '\x1b[34m', // Blue
        timestamp: '\x1b[90m', // Gray
      };

      const levelColor = (colors as any)[level] || colors.info;
      const formattedContext = context
        ? `${colors.context}[${context}]${colors.reset} `
        : '';
      const formattedStack = stack
        ? `\n${colors.error}${stack}${colors.reset}`
        : '';
      const metaStr =
        Object.keys(metadata).length > 0
          ? `\n${colors.timestamp}${JSON.stringify(metadata, null, 2)}${colors.reset}`
          : '';

      console.log(
        `${colors.timestamp}[${timestamp}]${colors.reset} ${levelColor}${level.toUpperCase().padEnd(7)}${colors.reset} ${formattedContext}${message}${metaStr}${formattedStack}`,
      );
    } else {
      // In production/staging, print structured JSON to stdout/stderr
      const logObj = {
        timestamp,
        level,
        message,
        context,
        ...(stack ? { error: { stack, message } } : {}),
        ...metadata,
      };

      if (level === 'error') {
        process.stderr.write(JSON.stringify(logObj) + '\n');
      } else {
        process.stdout.write(JSON.stringify(logObj) + '\n');
      }
    }
  }

  private queueLog(logData: {
    timestamp: string;
    level: string;
    message: string;
    context: string;
    stack: string;
    metadata: Record<string, any>;
  }) {
    const ddLog = {
      message: logData.message,
      status: logData.level,
      ddsource: 'nodejs',
      ddtags: `env:${this.envName},version:${this.version}`,
      hostname: this.hostname,
      service: this.serviceName,
      timestamp: logData.timestamp,
      logger: {
        name: logData.context || 'Application',
      },
      ...(logData.stack
        ? {
            error: {
              stack: logData.stack,
              message: logData.message,
              kind: logData.metadata.error?.kind || 'Error',
            },
          }
        : {}),
      // Merge other metadata at the root level for Datadog indexing
      ...logData.metadata,
    };

    this.queue.push(ddLog);

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  private flush() {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const payload = JSON.stringify(batch);
    const options = {
      hostname: `http-intake.logs.${this.ddSite}`,
      port: 443,
      path: '/api/v2/logs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.apiKey,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        // Fallback log using console.warn to avoid recursion
        console.warn(
          `[DatadogLogger] Direct Log Intake returned failure code: ${res.statusCode}`,
        );
      }
    });

    req.on('error', (err) => {
      console.warn(
        `[DatadogLogger] Direct Log Intake connection error: ${err.message}`,
      );
    });

    req.write(payload);
    req.end();
  }
}
