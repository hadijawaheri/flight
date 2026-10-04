import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class PriceAlert {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  origin!: string;

  @Prop({ type: String, required: true, trim: true })
  originName!: string;

  @Prop({ type: String, required: true, trim: true })
  destination!: string;

  @Prop({ type: String, required: true, trim: true })
  destinationName!: string;

  @Prop({ type: Number, required: true })
  targetMaxPrice!: number;

  @Prop({ type: String, default: null })
  targetDate?: string | null;

  @Prop({ type: Number, default: 0 })
  currentLowestPrice!: number;

  @Prop({ type: Boolean, default: true })
  notifyViaSms!: boolean;

  @Prop({ type: String, default: null, trim: true })
  mobile?: string | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastTriggeredAt?: Date | null;

  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export type PriceAlertDocument = HydratedDocument<PriceAlert>;
export const PriceAlertSchema = SchemaFactory.createForClass(PriceAlert);
PriceAlertSchema.plugin(softDeletePlugin);
PriceAlertSchema.index(
  { userId: 1, isActive: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
