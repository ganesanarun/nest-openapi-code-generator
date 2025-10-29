import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const traceId = uuidv4();

    // Add trace ID to request for downstream use
    (request as any).traceId = traceId;

    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection.remoteAddress;

    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      {
        traceId,
        method,
        url,
        body: this.sanitizeBody(body),
        query,
        params,
        userAgent,
        ip,
      },
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${duration}ms`,
            {
              traceId,
              method,
              url,
              statusCode,
              duration,
              responseSize: JSON.stringify(data).length,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `Request Error: ${method} ${url} - ${statusCode} - ${duration}ms`,
            {
              traceId,
              method,
              url,
              statusCode,
              duration,
              error: error.message,
              stack: error.stack,
            },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}