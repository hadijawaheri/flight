import type { Cabin } from "@flysmart/contracts";
import { CABINS } from "@flysmart/contracts";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export const PRICE_SOURCES = ["simulation", "observed"] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

// Long enough to compare a route with the same season last year
const RETENTION_SECONDS = 400 * 24 * 60 * 60;

/** What one flight cost on one day, as the site saw it. One row per flight, source and day. */
@Schema({ collection: "price_observations" })
export class PriceObservation {
  @Prop({ type: String, required: true })
  flightId!: string;

  // A simulated market's prices must never be mistaken for real ones once a provider is connected
  @Prop({ type: String, enum: PRICE_SOURCES, required: true })
  source!: PriceSource;

  /** Tehran calendar day of the observation (YYYY-MM-DD). */
  @Prop({ type: String, required: true })
  observedOn!: string;

  // Route fields are denormalised so a route's prices can be learned from after its flights depart
  @Prop({ type: String, required: true })
  origin!: string;

  @Prop({ type: String, required: true })
  destination!: string;

  @Prop({ type: String, enum: CABINS, required: true })
  cabin!: Cabin;

  @Prop({ type: String, required: true })
  departureDate!: string;

  @Prop({ type: Number, required: true })
  daysToDeparture!: number;

  /** Adult base fare (rial) at the latest observation of the day: the day's closing price. */
  @Prop({ type: Number, required: true })
  adultBaseFare!: number;

  @Prop({ type: Number, required: true })
  minFare!: number;

  @Prop({ type: Number, required: true })
  maxFare!: number;

  @Prop({ type: Number, default: null })
  seatsLeft!: number | null;

  @Prop({ type: Number, default: 1 })
  samples!: number;

  @Prop({ type: Date, required: true })
  firstObservedAt!: Date;

  @Prop({ type: Date, required: true })
  lastObservedAt!: Date;
}

export type PriceObservationDocument = HydratedDocument<PriceObservation>;
export const PriceObservationSchema = SchemaFactory.createForClass(PriceObservation);
PriceObservationSchema.index({ flightId: 1, source: 1, observedOn: 1 }, { unique: true });
PriceObservationSchema.index({ origin: 1, destination: 1, cabin: 1, source: 1, departureDate: 1 });
PriceObservationSchema.index({ lastObservedAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
