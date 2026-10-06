import type { Cabin, PriceAlertStatus } from "@flysmart/contracts";
import { CABINS, PRICE_ALERT_STATUSES } from "@flysmart/contracts";
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
