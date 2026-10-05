import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

/**
 * One row per seat that one of our bookings holds on a flight. The unique index is what makes
 * double-booking impossible: two concurrent bookings cannot both insert the same seat.
 */
@Schema({ timestamps: true })
export class SeatHold {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true })
  flightId!: string;

  @Prop({ type: String, required: true })
  seat!: string;

  @Prop({ type: Types.ObjectId, required: true })
  bookingId!: Types.ObjectId;

  // Null once the booking is paid: a confirmed seat never times out
  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;
}

export type SeatHoldDocument = HydratedDocument<SeatHold>;
export const SeatHoldSchema = SchemaFactory.createForClass(SeatHold);
SeatHoldSchema.index({ flightId: 1, seat: 1 }, { unique: true });
SeatHoldSchema.index({ bookingId: 1 });
// TTL only removes documents whose expiresAt is a date, so confirmed seats are never swept
SeatHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
