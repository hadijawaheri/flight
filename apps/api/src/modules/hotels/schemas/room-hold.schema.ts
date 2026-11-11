import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

/**
 * Rooms our travellers hold or have bought at a hotel, per room type and night. The simulated hotel
 * has a fixed number of rooms per night; what it can still sell is that minus these rows.
 */
@Schema({ timestamps: true })
export class RoomHold {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  hotelId!: string;

  @Prop({ type: String, required: true })
  roomId!: string;

  @Prop({ type: String, required: true })
  checkIn!: string;

  @Prop({ type: String, required: true })
  checkOut!: string;

  /** Every night of the stay, `YYYY-MM-DD`, so availability is one indexed match per night. */
  @Prop({ type: [String], required: true })
  nights!: string[];

  @Prop({ type: Number, required: true })
  rooms!: number;

  @Prop({ type: Number, required: true })
  total!: number;

  // Null once paid (issue 15): a bought room never times out
  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  createdAt!: Date;
}

export type RoomHoldDocument = HydratedDocument<RoomHold>;
export const RoomHoldSchema = SchemaFactory.createForClass(RoomHold);
RoomHoldSchema.index({ roomId: 1, nights: 1 });
RoomHoldSchema.index({ userId: 1, createdAt: -1 });
// TTL only removes documents whose expiresAt is a date, so bought rooms are never swept
RoomHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
