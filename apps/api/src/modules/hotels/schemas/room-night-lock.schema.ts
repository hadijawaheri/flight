import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

/**
 * One row per room type and night that has ever been held. Holds bump its version inside their
 * transaction, which turns two concurrent holds for the last room into a write conflict instead
 * of an oversale.
 */
@Schema()
export class RoomNightLock {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true })
  roomId!: string;

  @Prop({ type: String, required: true })
  night!: string;

  @Prop({ type: Number, default: 0 })
  version!: number;
}

export type RoomNightLockDocument = HydratedDocument<RoomNightLock>;
export const RoomNightLockSchema = SchemaFactory.createForClass(RoomNightLock);
RoomNightLockSchema.index({ roomId: 1, night: 1 }, { unique: true });
