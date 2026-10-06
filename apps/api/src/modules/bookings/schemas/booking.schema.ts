import type {
  BookingStatus,
  Cabin,
  FareBreakdown,
  FlightSummaryDto,
  Gender,
  PassengerType,
  RefundPolicy,
  SliceDirection,
} from "@flysmart/contracts";
import { BOOKING_STATUSES, CABINS, GENDERS, SLICE_DIRECTIONS } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { Types } from "mongoose";

type PerSlice<T> = Partial<Record<SliceDirection, T>>;

@Schema({ _id: false })
export class BookingSlice {
  @Prop({ type: String, enum: SLICE_DIRECTIONS, required: true })
  direction!: SliceDirection;

  @Prop({ type: String, required: true })
  flightId!: string;

  @Prop({ type: String, enum: CABINS, required: true })
  cabin!: Cabin;

  // Immutable snapshots: what the traveller bought must not change when the schedule model does
  @Prop({ type: Object, required: true })
  flight!: FlightSummaryDto;

  @Prop({ type: Object, required: true })
  fare!: FareBreakdown;

  @Prop({ type: Object, required: true })
  refundPolicy!: RefundPolicy;

  @Prop({ type: Number, default: 0 })
  seatFees!: number;

  @Prop({ type: Date, required: true })
  departureUtc!: Date;
}
export const BookingSliceSchema = SchemaFactory.createForClass(BookingSlice);

@Schema({ _id: false })
export class BookingPassenger {
  @Prop({ type: Number, required: true })
  index!: number;

  @Prop({ type: String, default: null })
  savedPassengerId!: string | null;

  @Prop({ type: String, required: true })
  firstNameFa!: string;

  @Prop({ type: String, required: true })
  lastNameFa!: string;

  @Prop({ type: String, required: true })
  firstNameEn!: string;

  @Prop({ type: String, required: true })
  lastNameEn!: string;

  @Prop({ type: String, required: true })
  nationalId!: string;

  @Prop({ type: String, required: true })
  birthDate!: string;

  @Prop({ type: String, enum: GENDERS, required: true })
  gender!: Gender;

  @Prop({ type: String, default: null })
  passportNumber!: string | null;

  @Prop({ type: String, default: null })
  passportExpiry!: string | null;

  // Age bands are evaluated per flight date, so an infant can be a child on the return leg
  @Prop({ type: Object, default: {} })
  types!: PerSlice<PassengerType>;

  @Prop({ type: Object, default: {} })
  seats!: PerSlice<string>;

  @Prop({ type: Object, default: {} })
  tickets!: PerSlice<string>;
}
export const BookingPassengerSchema = SchemaFactory.createForClass(BookingPassenger);

@Schema({ timestamps: true })
export class Booking {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  pnr!: string;

  @Prop({ type: String, enum: BOOKING_STATUSES, required: true })
  status!: BookingStatus;

  @Prop({ type: Object, required: true })
  contact!: { mobile: string; email: string | null };

  @Prop({ type: [BookingSliceSchema], required: true })
  slices!: BookingSlice[];

  @Prop({ type: [BookingPassengerSchema], required: true })
  passengers!: BookingPassenger[];

  @Prop({ type: Object, required: true })
  totals!: { fareTotal: number; seatFeesTotal: number; total: number };

  @Prop({ type: Date, default: null })
  holdExpiresAt!: Date | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: Object, default: null })
  refund!: {
    refundAmount: number;
    penaltyAmount: number;
    nonRefundableFees: number;
    processedAt: Date;
  } | null;

  // Denormalised so "upcoming trips" is a single indexed query
  @Prop({ type: Date, required: true })
  firstDepartureUtc!: Date;

  @Prop({ type: Date, required: true })
  lastDepartureUtc!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type BookingDocument = HydratedDocument<Booking>;
export const BookingSchemaDef = SchemaFactory.createForClass(Booking);
BookingSchemaDef.index({ pnr: 1 }, { unique: true });
BookingSchemaDef.index({ userId: 1, createdAt: -1 });
BookingSchemaDef.index({ userId: 1, lastDepartureUtc: 1 });
BookingSchemaDef.index({ status: 1, holdExpiresAt: 1 });
BookingSchemaDef.index({ "slices.flightId": 1, status: 1 });
