import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception.getResponse();

    // Log full exception details for debugging
    this.logger.error(
      `HTTP Exception: ${status} - ${JSON.stringify(exceptionResponse)}`,
    );
    if (exception.stack) this.logger.error(exception.stack);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message:
        typeof exceptionResponse === "object" && "message" in exceptionResponse
          ? exceptionResponse.message
          : exception.message,
    };

    response.status(status).json(errorResponse);
  }
}
