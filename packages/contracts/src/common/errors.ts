export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "FLIGHT_NOT_FOUND",
  "SEAT_UNAVAILABLE",
  "BOOKING_EXPIRED",
  "BOOKING_NOT_FOUND",
  "PASSENGER_NOT_FOUND",
  "PAYMENT_FAILED",
  "PRICE_ALERT_NOT_FOUND",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  requestId?: string;
}
