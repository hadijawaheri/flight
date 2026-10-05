import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { PaymentConfigDto, PaymentDto } from "@flysmart/contracts";
import { Model, Types } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import type { PaymentOutcome } from "../../infra/payment/payment.provider.js";
import { PaymentProvider } from "../../infra/payment/payment.provider.js";
import { toPaymentDto } from "./payments.mapper.js";
import type { PaymentDocument } from "./schemas/payment.schema.js";
import { Payment } from "./schemas/payment.schema.js";

const DUPLICATE_KEY = 11000;

export interface ChargeInput {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  description: string;
  outcome: PaymentOutcome;
}

/**
 * The payment ledger. It knows nothing about bookings beyond their id, so the booking module can
 * depend on it without a cycle: bookings decide *when* to charge and refund, this does the money.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly provider: PaymentProvider,
    private readonly clock: Clock,
  ) {}

  config(): PaymentConfigDto {
    return { provider: this.provider.name, simulated: this.provider.simulated };
  }

  async charge(input: ChargeInput): Promise<PaymentDto> {
    let created: PaymentDocument;
    try {
      created = await this.paymentModel.create({
        bookingId: input.bookingId,
        userId: input.userId,
        amount: input.amount,
        status: "PENDING",
        provider: this.provider.name,
        active: true,
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: number }).code === DUPLICATE_KEY
      ) {
        throw new AppException(
          409,
          "CONFLICT",
          "پرداخت این رزرو در حال انجام یا قبلاً انجام شده است",
        );
      }
      throw error;
    }

    try {
      const result = await this.provider.charge({
        paymentId: created._id.toString(),
        bookingId: input.bookingId.toString(),
        amount: input.amount,
        description: input.description,
        requestedOutcome: input.outcome,
      });
      const updated =
        result.status === "SUCCEEDED"
          ? await this.paymentModel
              .findByIdAndUpdate(
                created._id,
                {
                  $set: {
                    status: "SUCCEEDED",
                    referenceId: result.referenceId,
                    paidAt: this.clock.now(),
                  },
                },
                { returnDocument: "after" },
              )
              .lean()
          : await this.paymentModel
              .findByIdAndUpdate(
                created._id,
                { $set: { status: "FAILED", failureReason: result.reason, active: false } },
                { returnDocument: "after" },
              )
              .lean();
      if (!updated) throw new AppException(500, "INTERNAL", "پرداخت ثبت نشد");
      return toPaymentDto(updated);
    } catch (error: unknown) {
      // A gateway outage must not leave the booking locked behind a phantom in-flight payment
      await this.paymentModel.updateOne(
        { _id: created._id, status: "PENDING" },
        { $set: { status: "FAILED", failureReason: "خطا در ارتباط با درگاه", active: false } },
      );
      if (error instanceof AppException) throw error;
      throw new AppException(502, "PAYMENT_FAILED", "ارتباط با درگاه پرداخت برقرار نشد");
    }
  }

  /** Returns money for a paid booking; a no-op when nothing was paid. */
  async refundForBooking(bookingId: Types.ObjectId, amount: number): Promise<void> {
    const payment = await this.paymentModel
      .findOne({ bookingId, status: "SUCCEEDED", active: true })
      .lean();
    if (!payment) return;
    const refundAmount = Math.min(amount, payment.amount);
    if (refundAmount > 0 && payment.referenceId) {
      await this.provider.refund({
        paymentId: payment._id.toString(),
        referenceId: payment.referenceId,
        amount: refundAmount,
      });
    }
    await this.paymentModel.updateOne(
      { _id: payment._id },
      { $set: { status: "REFUNDED", active: false, refundedAmount: refundAmount } },
    );
  }

  async latestForBooking(bookingId: Types.ObjectId): Promise<PaymentDto | null> {
    const payment = await this.paymentModel.findOne({ bookingId }).sort({ createdAt: -1 }).lean();
    return payment ? toPaymentDto(payment) : null;
  }
}
