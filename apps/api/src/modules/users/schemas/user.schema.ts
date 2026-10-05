import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { Role } from "@flysmart/contracts";
import { ROLES } from "@flysmart/contracts";
import type { HydratedDocument, Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class User {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  mobile!: string;

  @Prop({ type: String, default: null, trim: true })
  firstName!: string | null;

  @Prop({ type: String, default: null, trim: true })
  lastName!: string | null;

  @Prop({ type: String, enum: ROLES, default: "user" })
  role!: Role;

  // Added by softDeletePlugin
  deletedAt?: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(softDeletePlugin);
// Unique only among live users, so a soft-deleted mobile can register again
UserSchema.index({ mobile: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
