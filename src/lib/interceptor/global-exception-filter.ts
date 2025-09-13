import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { logger } from '@/lib/logger/logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message;

      logger.error(
        {
          req: {
            id: request.id,
            method: request.method,
            url: request.url,
          },
          res: {
            statusCode: status,
          },
          err: {
            type: exception.constructor?.name,
            message: (exception as any).message,
            stack: (exception as any).stack,
          },
        },
        `Request failed: ${request.method} ${request.url}`,
      );
    }

    response.status(status).send({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
