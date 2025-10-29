import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const traceId = (request as any).traceId;

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          requestId: traceId,
          timestamp: new Date().toISOString(),
          version: '2.0.0',
        },
      })),
    );
  }
}