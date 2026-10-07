import type {
  DealDto,
  ExploreDestinationDto,
  ExploreResultDto,
  RouteKind,
  TripIdeaDto,
  TripIdeasDto,
} from "@flysmart/contracts";
import {
  addDaysIso,
  bandOfTotal,
  destinationsFrom,
  getAirport,
  getRoute,
  kindGap,
  TRIP_PARTIES,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { Clock } from "../../common/clock/clock.js";
import { TtlCache } from "../../common/ttl-cache.js";
import { FlightProvider, type FlightRecord } from "../../infra/flight/flight.provider.js";
import {
  adultTotalFor,
  capacityOf,
  departureDateOf,
  expandMix,
  fareFor,
  isSalesClosed,
} from "../flights/flight-view.js";
import { FlightsService } from "../flights/flights.service.js";
import type { ExploreQueryDto, FlashDealsQueryDto, TripIdeasQueryDto } from "./dto/deals.dto.js";

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
  private readonly tripsCache = new TtlCache<TripIdeasDto>(CACHE_TTL_MS);

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
    for (const destination of destinationsFrom(query.origin)) {
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
      const typical = adultTotalFor(record, this.provider.typicalFare(record));
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
    const kind: RouteKind | undefined =
      query.scope === "domestic"
        ? "DOMESTIC"
        : query.scope === "international"
          ? "INTERNATIONAL"
          : undefined;
    for (const destination of destinationsFrom(query.origin, kind)) {
      const airport = getAirport(destination);
      if (!airport) continue;
      const international = airport.countryCode !== "IR";

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

  /**
   * "We are N people; where can we go, and for how much?" The cheapest bookable flight to every
   * reachable destination, priced for the whole party and for flights with enough free seats.
   */
  async trips(query: TripIdeasQueryDto): Promise<TripIdeasDto> {
    const party = TRIP_PARTIES[query.party];
    const today = this.clock.today();
    const nowMs = this.clock.now().getTime();
    const key = [query.origin, query.party, query.scope, query.days, today].join("|");
    const cached = this.tripsCache.get(key, nowMs);
    if (cached) return cached;

    const kind: RouteKind = query.scope === "domestic" ? "DOMESTIC" : "INTERNATIONAL";
    const base = {
      origin: query.origin,
      party: query.party,
      scope: query.scope,
      adults: party.adults,
      children: party.children,
      infants: party.infants,
    };
    const note = kindGap(query.origin, kind);
    if (note) return this.tripsCache.set(key, { ...base, ideas: [], note }, nowMs);

    const types = expandMix(party);
    const seated = party.adults + party.children;
    const dates = Array.from({ length: query.days }, (_, offset) => addDaysIso(today, offset));
    const ideas: TripIdeaDto[] = [];
    for (const destination of destinationsFrom(query.origin, kind)) {
      const airport = getAirport(destination);
      if (!airport) continue;
      const cheapest = await this.cheapestAcross(query.origin, destination, dates, {
        seats: seated,
        price: (record) => fareFor(record, record.adultBaseFare, types).total,
      });
      if (!cheapest) continue;
      const { record, pricePerAdult: total } = cheapest;
      ideas.push({
        flightId: record.id,
        destination: airport.code,
        cityFa: airport.cityFa,
        countryFa: airport.countryFa,
        international: record.international,
        date: departureDateOf(record),
        airline: {
          code: record.airline.code,
          nameFa: record.airline.nameFa,
          nameEn: record.airline.nameEn,
        },
        durationMinutes: record.durationMinutes,
        totalForParty: total,
        perPerson: Math.round(total / types.length),
        band: bandOfTotal(total, query.party, query.scope),
      });
    }
    ideas.sort((a, b) => a.totalForParty - b.totalForParty);
    return this.tripsCache.set(key, { ...base, ideas, note: null }, nowMs);
  }

  /** How today's fare compares with the route's usual fare for that airline; below 1 is cheap. */
  private priceLevel(record: FlightRecord): number {
    const route = getRoute(record.origin.code, record.destination.code);
    const usual = (route?.baseFareRial ?? record.adultBaseFare) * record.airline.priceFactor;
    return record.adultBaseFare / usual;
  }

  /**
   * Cheapest bookable economy flight from `origin` to one airport over a set of dates; with `options`
   * the price is the whole party's and flights without enough seats are skipped. (`pricePerAdult`
   * then holds that party price.)
   */
  private async cheapestAcross(
    origin: string,
    destination: string,
    dates: readonly string[],
    options?: { seats: number; price: (record: FlightRecord) => number },
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
        // Approximate free seats from the load factor; the exact seat map is only built at booking
        if (options && Math.round(capacityOf(record) * (1 - record.loadFactor)) < options.seats)
          continue;
        const pricePerAdult = options
          ? options.price(record)
          : adultTotalFor(record, record.adultBaseFare);
        if (best === null || pricePerAdult < best.pricePerAdult) best = { record, pricePerAdult };
      }
    }
    return best;
  }
}
