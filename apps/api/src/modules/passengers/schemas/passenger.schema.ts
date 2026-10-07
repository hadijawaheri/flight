import type { Gender, NationalityCode } from "@flysmart/contracts";
import { GENDERS, NATIONALITY_CODES } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class Passenger {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  // Empty for a foreigner who gave no Persian name
  @Prop({ type: String, default: "", trim: true })
  firstNameFa!: string;

  @Prop({ type: String, default: "", trim: true })
  lastNameFa!: string;

  @Prop({ type: String, required: true, trim: true })
  firstNameEn!: string;

  @Prop({ type: String, required: true, trim: true })
  lastNameEn!: string;

  // Absent on documents saved before foreigners were supported: those are Iranian
  @Prop({ type: String, enum: NATIONALITY_CODES, default: "IR" })
  nationality?: NationalityCode;

  // Null for foreigners, who identify with a passport instead
  @Prop({ type: String, default: null })
  nationalId!: string | null;

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
// Partial filters keep the uniqueness rules away from the passengers that have no such field
// (foreigners have no national code); key order differs from the retired userId+nationalId index
// on purpose so both can exist while an old deployment is migrated.
PassengerSchema.index(
  { nationalId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null, nationalId: { $type: "string" } } },
);
PassengerSchema.index(
  { userId: 1, nationality: 1, passportNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null, passportNumber: { $type: "string" } },
  },
);
