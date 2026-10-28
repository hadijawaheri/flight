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

  // Null for foreigners, who identify with a passport instead. Encrypted at rest (ADR 0012).
  @Prop({ type: String, default: null })
  nationalId!: string | null;

  // Keyed hash of the national code: uniqueness and lookups without decrypting
  @Prop({ type: String, default: null })
  nationalIdHash?: string | null;

  // ISO date (YYYY-MM-DD); a birth date has no time zone
  @Prop({ type: String, required: true })
  birthDate!: string;

  @Prop({ type: String, enum: GENDERS, required: true })
  gender!: Gender;

  // Encrypted at rest (ADR 0012)
  @Prop({ type: String, default: null })
  passportNumber!: string | null;

  @Prop({ type: String, default: null })
  passportNumberHash?: string | null;

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
// (foreigners have no national code). The values themselves are encrypted with a random IV, so
// uniqueness is enforced on their blind indexes; the plaintext-era indexes are dropped by migration 0002.
PassengerSchema.index(
  { nationalIdHash: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null, nationalIdHash: { $type: "string" } },
  },
);
PassengerSchema.index(
  { userId: 1, nationality: 1, passportNumberHash: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null, passportNumberHash: { $type: "string" } },
  },
);
