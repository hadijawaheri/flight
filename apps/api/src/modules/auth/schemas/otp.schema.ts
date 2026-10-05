import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Otp {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true })
  mobile!: string;

  @Prop({ type: String, required: true })
  codeHash!: string;

  @Prop({ type: Date, required: true })
  sentAt!: Date;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Number, default: 0 })
  attempts!: number;
}

export type OtpDocument = HydratedDocument<Otp>;
export const OtpSchema = SchemaFactory.createForClass(Otp);
OtpSchema.index({ mobile: 1 }, { unique: true });
// Mongo removes expired codes on its own
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
