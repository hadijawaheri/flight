import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class RefreshToken {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  // Tokens of one login chain share a family so theft can revoke them together
  @Prop({ type: String, required: true })
  familyId!: string;

  @Prop({ type: String, required: true })
  tokenHash!: string;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  @Prop({ type: Boolean, default: false })
  familyRevoked!: boolean;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ familyId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
