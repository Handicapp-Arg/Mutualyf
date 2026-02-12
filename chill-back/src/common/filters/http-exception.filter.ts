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
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    // Log detallado del error
    this.logger.error(
      `Error ${status} en ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Respuesta estandarizada
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'Error desconocido',
      error:
        typeof message === 'object' && (message as any).error
          ? (message as any).error
          : undefined,
      details:
        process.env.NODE_ENV !== 'production' && exception instanceof Error
          ? exception.stack
          : undefined,
    };

    response.status(status).json(errorResponse);
  }
}
