import { Injectable } from "@nestjs/common";
import type { DealDto, ExploreDestinationDto, ExploreResultDto } from "@flysmart/contracts";
import { addDaysIso, AIRPORTS, expandAirportCode, getAirport, getRoute } from "@flysmart/contracts";

import { Clock } from "../../common/clock/clock.js";
import { TtlCache } from "../../common/ttl-cache.js";
import { FlightProvider, type FlightRecord } from "../../infra/flight/flight.provider.js";
import {
  adultTotalFor,
  capacityOf,
  departureDateOf,
  isSalesClosed,
} from "../flights/flight-view.js";
import { FlightsService } from "../flights/flights.service.js";
import type { ExploreQueryDto, FlashDealsQueryDto } from "./dto/deals.dto.js";

const FLASH_WINDOW_DAYS = 10;
const CACHE_TTL_MS = 5 * 60_000;
const MIN_DISCOUNT_PERCENT = 5;
const FLASH_CANDIDATES = 20;

interface Cheapest {
  record: FlightRecord;
  pricePerAdult: number;
}

@Injectable()
export class DealsService {
  private readonly flashCache = new TtlCache<DealDto[]>(CACHE_TTL_MS);
  private readonly exploreCache = new TtlCache<ExploreResultDto>(CACHE_TTL_MS);

  constructor(
    private readonly provider: FlightProvider,
    private readonly flights: FlightsService,
    private readonly clock: Clock,
  ) {}

  /** Fares that are unusually low for the flight itself, not merely cheap routes. */
  async flash(query: FlashDealsQueryDto): Promise<DealDto[]> {
    const nowMs = this.clock.now().getTime();
    const key = `${query.origin}|${query.limit}|${this.clock.today()}`;
    const cached = this.flashCache.get(key, nowMs);
    if (cached) return cached;

    const today = this.clock.today();
    const dates = Array.from({ length: FLASH_WINDOW_DAYS }, (_, offset) =>
      addDaysIso(today, offset),
    );
    const candidates: Cheapest[] = [];
    for (const destination of this.destinationsFrom(query.origin)) {
      const cheapest = await this.cheapestAcross(query.origin, destination, dates);
      if (cheapest) candidates.push(cheapest);
    }

    // Rank by price against what the route normally costs, then look closely at the best few
    const shortlisted = candidates
      .sort((a, b) => this.priceLevel(a.record) - this.priceLevel(b.record))
      .slice(0, FLASH_CANDIDATES);

    const deals: DealDto[] = [];
    for (const candidate of shortlisted) {
      const { record } = candidate;
      const seatsLeft = Math.round(capacityOf(record) * (1 - record.loadFactor));
      const insight = await this.flights.insightFor(record, seatsLeft);
      const typical = insight.stats.median;
      if (typical <= 0) continue;
      const discountPercent = Math.round(((typical - candidate.pricePerAdult) / typical) * 100);
      deals.push({
        flightId: record.id,
        origin: record.origin.code,
        destination: record.destination.code,
        originCityFa: record.origin.cityFa,
        destinationCityFa: record.destination.cityFa,
        date: departureDateOf(record),
        airline: {
          code: record.airline.code,
          nameFa: record.airline.nameFa,
          nameEn: record.airline.nameEn,
        },
        pricePerAdult: candidate.pricePerAdult,
        typicalPrice: typical,
        discountPercent,
        verdict: insight.verdict,
      });
    }

    const strong = deals.filter((deal) => deal.discountPercent >= MIN_DISCOUNT_PERCENT);
    const ranked = (strong.length > 0 ? strong : deals.filter((deal) => deal.discountPercent > 0))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, query.limit);
    return this.flashCache.set(key, ranked, nowMs);
  }

  /** "Where can I go for this budget?" — the cheapest day to every reachable destination. */
  async explore(query: ExploreQueryDto): Promise<ExploreResultDto> {
    const today = this.clock.today();
    const from = query.from && query.from > today ? query.from : today;
    const nowMs = this.clock.now().getTime();
    const key = [query.origin, query.budget, from, query.days, query.scope].join("|");
    const cached = this.exploreCache.get(key, nowMs);
    if (cached) return cached;

    const dates = Array.from({ length: query.days }, (_, offset) => addDaysIso(from, offset));
    const destinations: ExploreDestinationDto[] = [];
    for (const destination of this.destinationsFrom(query.origin)) {
      const airport = getAirport(destination);
      if (!airport) continue;
      const international = airport.countryCode !== "IR";
      if (query.scope === "domestic" && international) continue;
      if (query.scope === "international" && !international) continue;

      const cheapest = await this.cheapestAcross(query.origin, destination, dates);
      if (!cheapest || cheapest.pricePerAdult > query.budget) continue;
      destinations.push({
        destination: airport.code,
        cityFa: airport.cityFa,
        countryFa: airport.countryFa,
        international,
        cheapestPricePerAdult: cheapest.pricePerAdult,
        cheapestDate: departureDateOf(cheapest.record),
        flightId: cheapest.record.id,
        durationMinutes: cheapest.record.durationMinutes,
      });
    }
    destinations.sort((a, b) => a.cheapestPricePerAdult - b.cheapestPricePerAdult);
    return this.exploreCache.set(key, { budget: query.budget, destinations }, nowMs);
  }

  /** How today's fare compares with the route's usual fare for that airline; below 1 is cheap. */
  private priceLevel(record: FlightRecord): number {
    const route = getRoute(record.origin.code, record.destination.code);
    const usual = (route?.baseFareRial ?? record.adultBaseFare) * record.airline.priceFactor;
    return record.adultBaseFare / usual;
  }

  private destinationsFrom(origin: string): string[] {
    const origins = new Set(expandAirportCode(origin));
    return AIRPORTS.filter((airport) => !origins.has(airport.code))
      .filter((airport) => [...origins].some((code) => getRoute(code, airport.code) !== undefined))
      .map((airport) => airport.code);
  }

  /** Cheapest bookable economy flight from `origin` to one airport over a set of dates. */
  private async cheapestAcross(
    origin: string,
    destination: string,
    dates: readonly string[],
  ): Promise<Cheapest | null> {
    const now = this.clock.now();
    let best: Cheapest | null = null;
    for (const date of dates) {
      const records = await this.provider.search({
        origins: [origin],
        destinations: [destination],
        date,
        cabin: "ECONOMY",
      });
      for (const record of records) {
        if (isSalesClosed(record, now)) continue;
        const pricePerAdult = adultTotalFor(record, record.adultBaseFare);
        if (best === null || pricePerAdult < best.pricePerAdult) best = { record, pricePerAdult };
      }
    }
    return best;
  }
}
