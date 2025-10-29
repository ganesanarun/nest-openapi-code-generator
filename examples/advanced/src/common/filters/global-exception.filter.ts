import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuidv4();

    let status: number;
    let message: string;
    let code: string;
    let details: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        code = responseObj.error || HttpStatus[status];
        details = responseObj.details;
      } else {
        message = exceptionResponse as string;
        code = HttpStatus[status];
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
      details = exception instanceof Error ? exception.message : 'Unknown error';
    }

    const errorResponse = {
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      traceId,
      path: request.url,
      method: request.method,
    };

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      {
        traceId,
        status,
        message,
        details,
        stack: exception instanceof Error ? exception.stack : undefined,
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          query: request.query,
          params: request.params,
        },
      },
    );

    response.status(status).json(errorResponse);
  }
}