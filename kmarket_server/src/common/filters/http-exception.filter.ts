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
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Unknown error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const res = exceptionResponse as Record<string, unknown>;
                message = (res.message as string) || message;
                error = (res.error as string) || exception.name;
            }
        } else if (exception instanceof Error) {
            error = exception.name;
            message = exception.message;
            this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            error,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
}
