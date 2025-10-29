import { Module, Global } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Global()
@Module({
  providers: [
    GlobalExceptionFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
  exports: [
    GlobalExceptionFilter,
    LoggingInterceptor,
    TransformInterceptor,
  ],
})
export class CommonModule {}