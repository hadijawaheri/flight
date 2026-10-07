import type {
  AircraftType,
  Airline,
  Airport,
  Cabin,
  FareFamily,
  FlightType,
  PricePoint,
} from "@flysmart/contracts";

/** One bookable flight in one cabin, as returned by a flight data source. */
export interface FlightRecord {
  id: string;
  flightNumber: string;
  airline: Airline;
  aircraft: AircraftType;
  origin: Airport;
  destination: Airport;
  departureUtc: Date;
  arrivalUtc: Date;
  durationMinutes: number;
  cabin: Cabin;
  flightType: FlightType;
  fareFamily: FareFamily;
  international: boolean;
  /** Adult base fare today, rial, before taxes and fees. */
  adultBaseFare: number;
  /** Share (0–1) of the cabin already sold through other channels today. */
  loadFactor: number;
}

export interface FlightSearchParams {
  origins: string[];
  destinations: string[];
  /** Local departure date at the origin. */
  date: string;
  cabin: Cabin;
}

/**
 * Source of flights, fares and price history. The simulated market implements it for development
 * and demos; a real provider (charter/system aggregator) plugs in behind the same contract.
 */
export abstract class FlightProvider {
  /** Whether prices come from a model or from observed market data. */
  abstract readonly dataSource: "simulation" | "observed";

  abstract search(params: FlightSearchParams): Promise<FlightRecord[]>;
  abstract find(id: string): Promise<FlightRecord | null>;

  /** Adult base fares, oldest first, ending today. */
  abstract priceHistory(record: FlightRecord, pastDays: number): Promise<PricePoint[]>;

  /** Modelled adult base fares for the days after today, nearest first. */
  abstract priceForecast(record: FlightRecord, days: number): Promise<PricePoint[]>;

  /** Load factor (0–1) the flight is expected to have on a given observation date. */
  abstract loadFactorOn(record: FlightRecord, observationDate: string): number;

  /** Adult base fare on a given observation date (used by alerts and calendars). */
  abstract fareOn(record: FlightRecord, observationDate: string): number;

  /**
   * What this flight normally costs at today's distance from departure (adult base fare, rial).
   * A deal is a fare below it; comparing with past days would not do, because fares rise as
   * departure nears and every flight would look dearer than its own history.
   */
  abstract typicalFare(record: FlightRecord): number;
}
