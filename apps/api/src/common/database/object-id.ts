import { Types } from "mongoose";

import { AppException } from "../app-exception.js";
import type { ErrorCode } from "@flysmart/contracts";

/** Turns a path parameter into an ObjectId, answering 404 (not 500) for malformed values. */
export function parseObjectId(
  value: string,
  code: ErrorCode = "NOT_FOUND",
  message = "یافت نشد",
): Types.ObjectId {
  if (!Types.ObjectId.isValid(value) || String(new Types.ObjectId(value)) !== value) {
    throw new AppException(404, code, message);
  }
  return new Types.ObjectId(value);
}
