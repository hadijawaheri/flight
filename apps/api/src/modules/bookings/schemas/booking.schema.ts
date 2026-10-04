import type { BookingStatus, FlightDto, TicketDto } from "@flysmart/contracts";
import { BOOKING_STATUSES } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

import { softDeletePlugin } from "../../../common/database/soft-delete.plugin.js";

@Schema({ timestamps: true })
export class Booking {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  bookingReference!: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  flightId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  flightSnapshot!: FlightDto;

  @Prop({ type: Array, required: true })
  passengers!: Array<{
    id: string;
    passengerId?: string;
    firstNameFa: string;
    lastNameFa: string;
    firstNameEn: string;
    lastNameEn: string;
    nationalId: string;
    birthDate: string;
    gender: "MALE" | "FEMALE";
    passengerType: "ADULT" | "CHILD" | "INFANT";
    passportNumber?: string | null;
    seatPreference: "WINDOW" | "AISLE" | "ANY";
    selectedSeatNumber?: string;
    seatNumber: string;
    price: number;
  }>;

  @Prop({ type: Array, default: [] })
  tickets!: TicketDto[];

  @Prop({ type: Number, required: true })
  totalAmount!: number;

  @Prop({ type: String, enum: BOOKING_STATUSES, default: "PENDING_PAYMENT", index: true })
  status!: BookingStatus;

  @Prop({ type: String, required: true })
  contactMobile!: string;

  @Prop({ type: String, default: null })
  contactEmail?: string | null;

  @Prop({ type: String, default: null })
  paymentId?: string | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  deletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export type BookingDocument = HydratedDocument<Booking>;
export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.plugin(softDeletePlugin);
BookingSchema.index({ userId: 1, createdAt: -1 }, { partialFilterExpression: { deletedAt: null } });
