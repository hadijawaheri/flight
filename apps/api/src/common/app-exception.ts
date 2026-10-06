import type { ErrorCode } from "@flysmart/contracts";
import { HttpException } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message }, status);
  }
}
