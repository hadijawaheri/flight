import type { Gender } from "@flysmart/contracts";
import { GENDERS } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class Passenger {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  firstNameFa!: string;

  @Prop({ type: String, required: true, trim: true })
  lastNameFa!: string;

  @Prop({ type: String, required: true, trim: true })
  firstNameEn!: string;

  @Prop({ type: String, required: true, trim: true })
  lastNameEn!: string;

  @Prop({ type: String, required: true })
  nationalId!: string;

  // ISO date (YYYY-MM-DD); a birth date has no time zone
  @Prop({ type: String, required: true })
  birthDate!: string;

  @Prop({ type: String, enum: GENDERS, required: true })
  gender!: Gender;

  @Prop({ type: String, default: null })
  passportNumber!: string | null;

  @Prop({ type: String, default: null })
  passportExpiry!: string | null;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  createdAt!: Date;
  updatedAt!: Date;

  // Added by softDeletePlugin
  deletedAt?: Date | null;
}

export type PassengerDocument = HydratedDocument<Passenger>;
export const PassengerSchema = SchemaFactory.createForClass(Passenger);
PassengerSchema.plugin(softDeletePlugin);
PassengerSchema.index(
  { userId: 1, nationalId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
