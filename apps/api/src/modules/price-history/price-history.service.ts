import type { PricePoint } from "@flysmart/contracts";
import { addDaysIso } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { PinoLogger } from "nestjs-pino";

import { Clock } from "../../common/clock/clock.js";
import { TtlCache } from "../../common/ttl-cache.js";
import type { Env } from "../../config/env.js";
import { FlightProvider, type FlightRecord } from "../../infra/flight/flight.provider.js";
import { daysToDeparture, departureDateOf } from "../flights/flight-view.js";
import type { PriceObservationDocument } from "./schemas/price-observation.schema.js";
import { PriceObservation } from "./schemas/price-observation.schema.js";

export interface Sighting {
  record: FlightRecord;
  /** Unknown when the caller did not build a seat map (alert sweeps). */
  seatsLeft: number | null;
}

// The same fare seen again within this window is not worth a write
const REWRITE_AFTER_MS = 30 * 60_000;
const MAX_REMEMBERED = 20_000;

/**
 * Keeps the fares the site actually saw, one row per flight and day, so the price analysis can
 * stand on observed history instead of only a provider's model. With the simulated market the rows
 * equal the model; once a real provider is connected they become the only memory of past prices.
 */
@Injectable()
export class PriceHistoryService {
  private readonly recent = new TtlCache<number>(REWRITE_AFTER_MS, MAX_REMEMBERED);

  constructor(
    @InjectModel(PriceObservation.name)
    private readonly observationModel: Model<PriceObservationDocument>,
    private readonly provider: FlightProvider,
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: PinoLogger,
  ) {}

  private get enabled(): boolean {
    return this.config.get("PRICE_HISTORY_ENABLED", { infer: true });
  }

  /** Stores today's fares. Never throws: losing a sample must not fail a search. */
  async record(sightings: readonly Sighting[]): Promise<void> {
    if (!this.enabled || sightings.length === 0) return;
    const now = this.clock.now();
    const today = this.clock.today();
    const source = this.provider.dataSource;

    const operations = [];
    const remembered: [string, number][] = [];
    for (const { record, seatsLeft } of sightings) {
      const key = `${record.id}|${today}`;
      if (this.recent.get(key, now.getTime()) === record.adultBaseFare) continue;
      remembered.push([key, record.adultBaseFare]);
      operations.push({
        updateOne: {
          filter: { flightId: record.id, source, observedOn: today },
          update: {
            $setOnInsert: {
              origin: record.origin.code,
              destination: record.destination.code,
              cabin: record.cabin,
              departureDate: departureDateOf(record),
              daysToDeparture: daysToDeparture(record, today),
              firstObservedAt: now,
            },
            $set: {
              adultBaseFare: record.adultBaseFare,
              lastObservedAt: now,
              ...(seatsLeft === null ? {} : { seatsLeft }),
            },
            $min: { minFare: record.adultBaseFare },
            $max: { maxFare: record.adultBaseFare },
            $inc: { samples: 1 },
          },
          upsert: true,
        },
      });
    }
    if (operations.length === 0) return;

    try {
      await this.observationModel.bulkWrite(operations, { ordered: false });
      for (const [key, fare] of remembered) this.recent.set(key, fare, now.getTime());
    } catch (error: unknown) {
      // Usually two requests upserting the same new row at once; the other one won
      this.logger.warn({ err: error, count: operations.length }, "Price observations not saved");
    }
  }

  /** Observed closing fares per flight for today and the `pastDays` days before, oldest first. */
  async observedFor(
    records: readonly FlightRecord[],
    pastDays: number,
  ): Promise<Map<string, PricePoint[]>> {
    const result = new Map<string, PricePoint[]>();
    if (!this.enabled || records.length === 0) return result;
    const rows = await this.observationModel
      .find({
        flightId: { $in: records.map((record) => record.id) },
        source: this.provider.dataSource,
        observedOn: { $gte: addDaysIso(this.clock.today(), -pastDays) },
      })
      .select({ flightId: 1, observedOn: 1, adultBaseFare: 1 })
      .sort({ observedOn: 1 })
      .lean();
    for (const row of rows) {
      const points = result.get(row.flightId) ?? [];
      points.push({ date: row.observedOn, price: row.adultBaseFare });
      result.set(row.flightId, points);
    }
    return result;
  }
}

/**
 * The provider's history with every observed day taking precedence over the model's value for that
 * day, oldest first. Days only the site saw are added; the window never grows past `pastDays`.
 */
export function mergeHistory(
  modelled: readonly PricePoint[],
  observed: readonly PricePoint[],
  today: string,
  pastDays: number,
): PricePoint[] {
  const byDate = new Map<string, number>();
  for (const point of modelled) byDate.set(point.date, point.price);
  for (const point of observed) byDate.set(point.date, point.price);
  const first = addDaysIso(today, -pastDays);
  return [...byDate.entries()]
    .filter(([date]) => date >= first && date <= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}
