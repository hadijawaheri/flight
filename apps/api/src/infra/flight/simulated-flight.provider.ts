import {
  addDaysIso,
  type Cabin,
  diffDaysIso,
  expandAirportCode,
  parseFlightId,
  type PricePoint,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { Clock } from "../../common/clock/clock.js";
import type { FlightRecord, FlightSearchParams } from "./flight.provider.js";
import { FlightProvider } from "./flight.provider.js";
import {
  fareAt,
  flightIdOf,
  loadFactorAt,
  observationDates,
  SALES_HORIZON_DAYS,
} from "./simulation/pricing-model.js";
import { findScheduled, type ScheduledFlight, scheduleFor } from "./simulation/schedule.js";

function offersCabin(flight: ScheduledFlight, cabin: Cabin): boolean {
  if (cabin === "ECONOMY") return true;
  return flight.airline.hasBusiness && flight.aircraft.businessRows > 0;
}

@Injectable()
export class SimulatedFlightProvider extends FlightProvider {
  readonly dataSource = "simulation" as const;

  constructor(private readonly clock: Clock) {
    super();
  }

  search(params: FlightSearchParams): Promise<FlightRecord[]> {
    const origins = params.origins.flatMap((code) => expandAirportCode(code));
    const destinations = params.destinations.flatMap((code) => expandAirportCode(code));
    const records: FlightRecord[] = [];
    for (const origin of origins) {
      for (const destination of destinations) {
        if (origin === destination) continue;
        for (const flight of scheduleFor(origin, destination, params.date)) {
          if (offersCabin(flight, params.cabin)) records.push(this.toRecord(flight, params.cabin));
        }
      }
    }
    return Promise.resolve(records);
  }

  find(id: string): Promise<FlightRecord | null> {
    const key = parseFlightId(id);
    if (!key) return Promise.resolve(null);
    const flight = findScheduled(key);
    if (!flight || !offersCabin(flight, key.cabin)) return Promise.resolve(null);
    if (diffDaysIso(key.date, this.clock.today()) > SALES_HORIZON_DAYS)
      return Promise.resolve(null);
    return Promise.resolve(this.toRecord(flight, key.cabin));
  }

  priceHistory(record: FlightRecord, pastDays: number): Promise<PricePoint[]> {
    const flight = this.scheduledOf(record);
    if (!flight) return Promise.resolve([]);
    const dates = observationDates(this.clock.today(), flight, pastDays);
    return Promise.resolve(
      dates.map((date) => ({ date, price: fareAt(flight, record.cabin, date) })),
    );
  }

  priceForecast(record: FlightRecord, days: number): Promise<PricePoint[]> {
    const flight = this.scheduledOf(record);
    if (!flight) return Promise.resolve([]);
    const today = this.clock.today();
    const points: PricePoint[] = [];
    for (let offset = 1; offset <= days; offset += 1) {
      const date = addDaysIso(today, offset);
      if (date > flight.key.date) break;
      points.push({ date, price: fareAt(flight, record.cabin, date, { expected: true }) });
    }
    return Promise.resolve(points);
  }

  loadFactorOn(record: FlightRecord, observationDate: string): number {
    const flight = this.scheduledOf(record);
    if (!flight) return 1;
    return loadFactorAt(flight, record.cabin, diffDaysIso(flight.key.date, observationDate));
  }

  fareOn(record: FlightRecord, observationDate: string): number {
    const flight = this.scheduledOf(record);
    return flight ? fareAt(flight, record.cabin, observationDate) : record.adultBaseFare;
  }

  typicalFare(record: FlightRecord): number {
    const flight = this.scheduledOf(record);
    return flight
      ? fareAt(flight, record.cabin, this.clock.today(), { expected: true })
      : record.adultBaseFare;
  }

  private scheduledOf(record: FlightRecord): ScheduledFlight | null {
    const key = parseFlightId(record.id);
    return key ? findScheduled(key) : null;
  }

  private toRecord(flight: ScheduledFlight, cabin: Cabin): FlightRecord {
    const today = this.clock.today();
    return {
      id: flightIdOf(flight, cabin),
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      aircraft: flight.aircraft,
      origin: flight.origin,
      destination: flight.destination,
      departureUtc: flight.departureUtc,
      arrivalUtc: flight.arrivalUtc,
      durationMinutes: flight.blockMinutes,
      cabin,
      flightType: flight.flightType,
      fareFamily: flight.fareFamily,
      international: flight.route.international,
      adultBaseFare: fareAt(flight, cabin, today),
      loadFactor: loadFactorAt(flight, cabin, diffDaysIso(flight.key.date, today)),
    };
  }
}
