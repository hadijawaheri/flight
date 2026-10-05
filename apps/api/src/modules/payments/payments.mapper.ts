import type { PaymentDto } from "@flysmart/contracts";

import type { Payment } from "./schemas/payment.schema.js";

export function toPaymentDto(payment: Payment): PaymentDto {
  return {
    id: payment._id.toString(),
    bookingId: payment.bookingId.toString(),
    amount: payment.amount,
    status: payment.status,
    provider: payment.provider,
    referenceId: payment.referenceId,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
  };
}
