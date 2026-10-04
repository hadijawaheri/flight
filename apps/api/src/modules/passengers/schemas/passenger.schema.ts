import type { Gender, PassengerType } from "@flysmart/contracts";
import { GENDERS, PASSENGER_TYPES } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class Passenger {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  firstNameFa!: string;

  @Prop({ type: String, required: true, trim: true })
  lastNameFa!: string;

  @Prop({ type: String, required: true, trim: true })
  firstNameEn!: string;

  @Prop({ type: String, required: true, trim: true })
  lastNameEn!: string;

  @Prop({ type: String, required: true, trim: true })
  nationalId!: string;

  @Prop({ type: String, required: true, trim: true })
  birthDate!: string;

  @Prop({ type: String, enum: GENDERS, required: true })
  gender!: Gender;

  @Prop({ type: String, enum: PASSENGER_TYPES, default: "ADULT" })
  passengerType!: PassengerType;

  @Prop({ type: String, default: null, trim: true })
  passportNumber?: string | null;

  @Prop({ type: String, default: null, trim: true })
  passportExpiry?: string | null;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export type PassengerDocument = HydratedDocument<Passenger>;
export const PassengerSchema = SchemaFactory.createForClass(Passenger);
PassengerSchema.plugin(softDeletePlugin);
PassengerSchema.index(
  { userId: 1, nationalId: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
