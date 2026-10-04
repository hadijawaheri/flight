import type { ErrorCode } from "@flysmart/contracts";
import { HttpException } from "@nestjs/common";

export class AppException extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super({ code, message }, status);
  }
}
