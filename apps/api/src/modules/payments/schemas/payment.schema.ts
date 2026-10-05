import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { PaymentStatus } from "@flysmart/contracts";
import { PAYMENT_STATUSES } from "@flysmart/contracts";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Payment {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  /** Rial. */
  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, enum: PAYMENT_STATUSES, required: true })
  status!: PaymentStatus;

  @Prop({ type: String, required: true })
  provider!: string;

  @Prop({ type: String, default: null })
  referenceId!: string | null;

  @Prop({ type: String, default: null })
  failureReason!: string | null;

  // True while a payment is in flight or succeeded; the partial unique index below allows
  // at most one such payment per booking, which is what prevents a double charge.
  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: Number, default: 0 })
  refundedAmount!: number;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { active: true } });
PaymentSchema.index({ userId: 1, createdAt: -1 });
