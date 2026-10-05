import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException } from "@nestjs/common";
import type { ApiErrorBody, ErrorCode } from "@flysmart/contracts";
import type { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";

import { AppException } from "../app-exception.js";
import { ZodValidationException } from "../zod/zod-validation.pipe.js";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

const INTERNAL_MESSAGE = "خطای غیرمنتظره‌ای رخ داد";
const RATE_LIMIT_MESSAGE = "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید";

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === "string") return response;
  const message = (response as { message?: string | string[] }).message;
  return Array.isArray(message) ? (message[0] ?? INTERNAL_MESSAGE) : (message ?? exception.message);
}

export function toErrorBody(exception: unknown, requestId?: string): ApiErrorBody {
  if (exception instanceof ZodValidationException) {
    return {
      statusCode: 400,
      code: "VALIDATION_FAILED",
      message: exception.message,
      details: exception.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      requestId,
    };
  }
  if (exception instanceof AppException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      message: messageOf(exception),
      ...(exception.details === undefined ? {} : { details: exception.details }),
      requestId,
    };
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const code = STATUS_TO_CODE[statusCode] ?? "INTERNAL";
    return {
      statusCode,
      code,
      message: statusCode === 429 ? RATE_LIMIT_MESSAGE : messageOf(exception),
      requestId,
    };
  }
  return { statusCode: 500, code: "INTERNAL", message: INTERNAL_MESSAGE, requestId };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const body = toErrorBody(exception, String(req.id ?? ""));
    if (body.statusCode >= 500) this.logger.error({ err: exception }, "Unhandled exception");

    res.status(body.statusCode).json(body);
  }
}
