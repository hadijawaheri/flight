import type { Cabin, PriceAlertSmsStatus, PriceAlertStatus } from "@flysmart/contracts";
import { CABINS, PRICE_ALERT_SMS_STATUSES, PRICE_ALERT_STATUSES } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class PriceAlert {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  // Airport or city-group code, as the traveller searched it (e.g. TEH)
  @Prop({ type: String, required: true })
  origin!: string;

  @Prop({ type: String, required: true })
  destination!: string;

  @Prop({ type: String, required: true })
  date!: string;

  @Prop({ type: String, enum: CABINS, default: "ECONOMY" })
  cabin!: Cabin;

  /** Rial per adult, taxes and fees included. */
  @Prop({ type: Number, required: true })
  targetPrice!: number;

  @Prop({ type: String, enum: PRICE_ALERT_STATUSES, default: "ACTIVE" })
  status!: PriceAlertStatus;

  @Prop({ type: Date, default: null })
  triggeredAt!: Date | null;

  @Prop({ type: Number, default: null })
  triggeredPrice!: number | null;

  @Prop({ type: String, default: null })
  triggeredFlightId!: string | null;

  // Null until the alert fires; a re-armed alert starts over
  @Prop({ type: String, enum: [...PRICE_ALERT_SMS_STATUSES, null], default: null })
  smsStatus!: PriceAlertSmsStatus | null;

  @Prop({ type: Number, default: 0 })
  smsAttempts!: number;

  // When the current attempt started: a PENDING older than the lease belongs to a crashed process
  @Prop({ type: Date, default: null })
  smsClaimedAt!: Date | null;

  @Prop({ type: Date, default: null })
  smsSentAt!: Date | null;

  // Operator or network error of the last failed attempt, for support; never shown to the traveller
  @Prop({ type: String, default: null })
  smsLastError!: string | null;

  createdAt!: Date;
  updatedAt!: Date;

  // Added by softDeletePlugin
  deletedAt?: Date | null;
}

export type PriceAlertDocument = HydratedDocument<PriceAlert>;
export const PriceAlertSchema = SchemaFactory.createForClass(PriceAlert);
PriceAlertSchema.plugin(softDeletePlugin);
PriceAlertSchema.index({ userId: 1, status: 1, date: 1 });
PriceAlertSchema.index({ status: 1, date: 1 });
PriceAlertSchema.index({ status: 1, smsStatus: 1, triggeredAt: 1 });
