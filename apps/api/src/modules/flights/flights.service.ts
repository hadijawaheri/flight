import type {
  AirlineFacetDto,
  Cabin,
  FareCalendarDto,
  FlightOfferDto,
  FlightSearchResultDto,
  FlightTag,
  PriceAnalysisDto,
  PriceInsight,
  PricePoint,
  SeatMapDto,
} from "@flysmart/contracts";
import {
  addDaysIso,
  analyzePrice,
  buildSeatMap,
  demandForDate,
  diffDaysIso,
  isFlightId,
  summarizeInsight,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { FlightProvider, type FlightRecord } from "../../infra/flight/flight.provider.js";
import { SALES_HORIZON_DAYS } from "../../infra/flight/simulation/pricing-model.js";
import { InventoryService } from "../inventory/inventory.service.js";
import type {
  FareCalendarQueryDto,
  FlightQuoteQueryDto,
  SearchFlightsQueryDto,
} from "./dto/flights.dto.js";
import {
  adultTotalFor,
  capacityOf,
  daysToDeparture,
  demandOf,
  departureDateOf,
  expandMix,
  fareFor,
  isSalesClosed,
  refundPolicyOf,
  timeBucketOf,
  toFlightSummary,
  windowDates,
} from "./flight-view.js";

const HISTORY_DAYS = 45;
const FORECAST_DAYS = 14;
const CALENDAR_WINDOW = 3;

interface RecordWithSeats {
  record: FlightRecord;
  seatMap: SeatMapDto;
  seatsLeft: number;
}

@Injectable()
export class FlightsService {
  constructor(
    private readonly provider: FlightProvider,
    private readonly inventory: InventoryService,
    private readonly clock: Clock,
  ) {}

  /* ------------------------------- lookup helpers ------------------------------- */

  /** Resolves a flight id for booking: it must exist and online sales must still be open. */
  async resolveBookable(id: string): Promise<FlightRecord> {
    const record = await this.resolve(id);
    if (isSalesClosed(record, this.clock.now())) {
      throw new AppException(409, "FLIGHT_DEPARTED", "فروش اینترنتی این پرواز بسته شده است");
    }
    return record;
  }

  async resolve(id: string): Promise<FlightRecord> {
    // A malformed id is a client mistake (400); only a well-formed id that matches nothing is a 404
    if (!isFlightId(id))
      throw new AppException(400, "VALIDATION_FAILED", "شناسه‌ی پرواز معتبر نیست");
    const record = await this.provider.find(id);
    if (!record) throw new AppException(404, "FLIGHT_NOT_FOUND", "پرواز یافت نشد");
    return record;
  }

  async seatsOf(records: readonly FlightRecord[]): Promise<Map<string, RecordWithSeats>> {
    const reserved = await this.inventory.reservedSeats(records.map((record) => record.id));
    const result = new Map<string, RecordWithSeats>();
    for (const record of records) {
      const seatMap = buildSeatMap({
        aircraftId: record.aircraft.id,
        flightKey: record.id,
        loadFactor: record.loadFactor,
        reservedSeats: reserved.get(record.id) ?? new Set<string>(),
      });
      result.set(record.id, { record, seatMap, seatsLeft: seatMap.freeSeats[record.cabin] });
    }
    return result;
  }

  /* ----------------------------------- search ----------------------------------- */

  async search(query: SearchFlightsQueryDto): Promise<FlightSearchResultDto> {
    this.assertSearchable(query.date);
    const mix = { adults: query.adults, children: query.children, infants: query.infants };
    const seated = mix.adults + mix.children;

    const found = await this.provider.search({
      origins: [query.origin],
      destinations: [query.destination],
      date: query.date,
      cabin: query.cabin,
    });
    const now = this.clock.now();
    const open = found.filter((record) => !isSalesClosed(record, now));
    const seats = await this.seatsOf(open);

    let candidates = open.filter((record) => (seats.get(record.id)?.seatsLeft ?? 0) >= seated);
    if (query.airlines?.length)
      candidates = candidates.filter((record) => query.airlines?.includes(record.airline.code));
    if (query.flightType)
      candidates = candidates.filter((record) => record.flightType === query.flightType);
    if (query.times?.length)
      candidates = candidates.filter((record) => query.times?.includes(timeBucketOf(record)));

    const types = expandMix(mix);
    const offers: FlightOfferDto[] = [];
    for (const record of candidates) {
      const entry = seats.get(record.id) as RecordWithSeats;
      const fare = fareFor(record, record.adultBaseFare, types);
      const pricePerAdult = adultTotalFor(record, record.adultBaseFare);
      if (query.maxPrice !== undefined && pricePerAdult > query.maxPrice) continue;

      const insight = await this.insightFor(record, entry.seatsLeft);
      offers.push({
        ...toFlightSummary(record),
        seatsLeft: entry.seatsLeft,
        adultBaseFare: record.adultBaseFare,
        pricePerAdult,
        fare,
        refundPolicy: refundPolicyOf(record),
        insight: summarizeInsight(insight),
        tags: [],
      });
    }

    this.tag(offers);
    this.sort(offers, query.sort);

    const prices = offers.map((offer) => offer.pricePerAdult);
    const demand = demandForDate(query.date);
    return {
      offers,
      summary: {
        count: offers.length,
        minPricePerAdult: prices.length ? Math.min(...prices) : null,
        maxPricePerAdult: prices.length ? Math.max(...prices) : null,
        airlines: this.facets(offers),
        demandReasons: demand.reasons,
        isPeakDate: demand.isPeak,
      },
    };
  }

  async getOffer(id: string, query: FlightQuoteQueryDto): Promise<FlightOfferDto> {
    const record = await this.resolve(id);
    const entry = (await this.seatsOf([record])).get(record.id) as RecordWithSeats;
    const insight = await this.insightFor(record, entry.seatsLeft);
    return {
      ...toFlightSummary(record),
      seatsLeft: entry.seatsLeft,
      adultBaseFare: record.adultBaseFare,
      pricePerAdult: adultTotalFor(record, record.adultBaseFare),
      fare: fareFor(record, record.adultBaseFare, expandMix(query)),
      refundPolicy: refundPolicyOf(record),
      insight: summarizeInsight(insight),
      tags: [],
    };
  }

  async seatMap(id: string): Promise<SeatMapDto> {
    const record = await this.resolve(id);
    return ((await this.seatsOf([record])).get(record.id) as RecordWithSeats).seatMap;
  }

  /* ---------------------------------- analysis ---------------------------------- */

  async priceAnalysis(id: string): Promise<PriceAnalysisDto> {
    const record = await this.resolve(id);
    const entry = (await this.seatsOf([record])).get(record.id) as RecordWithSeats;
    const insight = await this.insightFor(record, entry.seatsLeft);
    const history = await this.historyTotals(record);
    const forecast = await this.forecastTotals(record);
    const today = this.clock.today();
    const currentPrice = adultTotalFor(record, record.adultBaseFare);

    const cheaperDates: PriceAnalysisDto["cheaperDates"] = [];
    const flightDate = departureDateOf(record);
    for (const date of windowDates(flightDate, CALENDAR_WINDOW, today, SALES_HORIZON_DAYS)) {
      if (date === flightDate) continue;
      const cheapest = await this.cheapestOn(record, date);
      if (cheapest !== null && cheapest < currentPrice * 0.95) {
        cheaperDates.push({ date, pricePerAdult: cheapest, savings: currentPrice - cheapest });
      }
    }
    cheaperDates.sort((a, b) => b.savings - a.savings);

    return {
      flightId: record.id,
      currentPrice,
      daysToDeparture: Math.max(0, daysToDeparture(record, today)),
      insight,
      history,
      forecast,
      cheaperDates: cheaperDates.slice(0, 3),
    };
  }

  async fareCalendar(query: FareCalendarQueryDto): Promise<FareCalendarDto> {
    const today = this.clock.today();
    const start = query.from && query.from >= today ? query.from : today;
    const days: FareCalendarDto["days"] = [];
    const now = this.clock.now();

    for (let offset = 0; offset < query.days; offset += 1) {
      const date = addDaysIso(start, offset);
      if (diffDaysIso(date, today) > SALES_HORIZON_DAYS) break;
      const records = (
        await this.provider.search({
          origins: [query.origin],
          destinations: [query.destination],
          date,
          cabin: query.cabin,
        })
      ).filter((record) => !isSalesClosed(record, now));
      const prices = records.map((record) => adultTotalFor(record, record.adultBaseFare));
      days.push({
        date,
        lowestPricePerAdult: prices.length ? Math.min(...prices) : null,
        isPeak: records[0] ? demandOf(records[0]).isPeak : false,
      });
    }

    const priced = days.filter((day) => day.lowestPricePerAdult !== null);
    const cheapest = priced.reduce<(typeof priced)[number] | null>(
      (best, day) =>
        best === null ||
        (day.lowestPricePerAdult ?? Infinity) < (best.lowestPricePerAdult ?? Infinity)
          ? day
          : best,
      null,
    );
    return {
      origin: query.origin,
      destination: query.destination,
      cabin: query.cabin,
      days,
      cheapestDate: cheapest?.date ?? null,
    };
  }

  /* ------------------------------ shared by other modules ------------------------------ */

  /** Cheapest open per-adult total on a route/date, or null when nothing is bookable. */
  async cheapestFor(
    origin: string,
    destination: string,
    date: string,
    cabin: Cabin,
  ): Promise<{ record: FlightRecord; pricePerAdult: number } | null> {
    const now = this.clock.now();
    const records = (
      await this.provider.search({ origins: [origin], destinations: [destination], date, cabin })
    ).filter((record) => !isSalesClosed(record, now));
    let best: { record: FlightRecord; pricePerAdult: number } | null = null;
    for (const record of records) {
      const price = adultTotalFor(record, record.adultBaseFare);
      if (best === null || price < best.pricePerAdult) best = { record, pricePerAdult: price };
    }
    return best;
  }

  async insightFor(record: FlightRecord, seatsLeft: number): Promise<PriceInsight> {
    const history = await this.historyTotals(record);
    const forecast = await this.forecastTotals(record);
    const demand = demandOf(record);
    return analyzePrice({
      history,
      forecast,
      daysToDeparture: Math.max(0, daysToDeparture(record, this.clock.today())),
      seatsLeft,
      capacity: capacityOf(record),
      isPeakDate: demand.isPeak,
      demandReasons: demand.reasons,
      dataSource: this.provider.dataSource === "simulation" ? "simulation" : "observed",
    });
  }

  /* ----------------------------------- internals ----------------------------------- */

  private async historyTotals(record: FlightRecord): Promise<PricePoint[]> {
    const history = await this.provider.priceHistory(record, HISTORY_DAYS);
    return history.map((point) => ({
      date: point.date,
      price: adultTotalFor(record, point.price),
    }));
  }

  private async forecastTotals(record: FlightRecord): Promise<PricePoint[]> {
    const forecast = await this.provider.priceForecast(record, FORECAST_DAYS);
    return forecast.map((point) => ({
      date: point.date,
      price: adultTotalFor(record, point.price),
    }));
  }

  private async cheapestOn(like: FlightRecord, date: string): Promise<number | null> {
    const now = this.clock.now();
    const records = (
      await this.provider.search({
        origins: [like.origin.code],
        destinations: [like.destination.code],
        date,
        cabin: like.cabin,
      })
    ).filter((record) => !isSalesClosed(record, now));
    if (records.length === 0) return null;
    return Math.min(...records.map((record) => adultTotalFor(record, record.adultBaseFare)));
  }

  private assertSearchable(date: string): void {
    const today = this.clock.today();
    if (date < today) throw new AppException(400, "VALIDATION_FAILED", "تاریخ پرواز گذشته است");
    if (diffDaysIso(date, today) > SALES_HORIZON_DAYS) {
      throw new AppException(
        400,
        "VALIDATION_FAILED",
        "فروش بلیت برای این تاریخ هنوز آغاز نشده است",
      );
    }
  }

  private tag(offers: FlightOfferDto[]): void {
    if (offers.length === 0) return;
    const cheapest = offers.reduce((best, offer) =>
      offer.pricePerAdult < best.pricePerAdult ? offer : best,
    );
    const fastest = offers.reduce((best, offer) =>
      offer.durationMinutes < best.durationMinutes ? offer : best,
    );
    const minPrice = cheapest.pricePerAdult;
    const minDuration = fastest.durationMinutes;
    const score = (offer: FlightOfferDto): number =>
      offer.pricePerAdult / minPrice + 0.35 * (offer.durationMinutes / minDuration);
    const best = offers.reduce((top, offer) => (score(offer) < score(top) ? offer : top));

    const add = (offer: FlightOfferDto, tag: FlightTag): void => {
      if (!offer.tags.includes(tag)) offer.tags.push(tag);
    };
    add(cheapest, "CHEAPEST");
    // Several flights with the same duration would all be "fastest"; only tag when it is a real difference
    if (offers.some((offer) => offer.durationMinutes > minDuration)) add(fastest, "FASTEST");
    if (offers.length > 2) add(best, "BEST_VALUE");
  }

  private sort(offers: FlightOfferDto[], sort: SearchFlightsQueryDto["sort"]): void {
    if (offers.length === 0) return;
    const minPrice = Math.min(...offers.map((offer) => offer.pricePerAdult));
    const minDuration = Math.min(...offers.map((offer) => offer.durationMinutes));
    const byDeparture = (a: FlightOfferDto, b: FlightOfferDto): number =>
      a.departureUtc.localeCompare(b.departureUtc);
    const comparators: Record<
      SearchFlightsQueryDto["sort"],
      (a: FlightOfferDto, b: FlightOfferDto) => number
    > = {
      price: (a, b) => a.pricePerAdult - b.pricePerAdult || byDeparture(a, b),
      departure: byDeparture,
      duration: (a, b) =>
        a.durationMinutes - b.durationMinutes || a.pricePerAdult - b.pricePerAdult,
      best: (a, b) =>
        a.pricePerAdult / minPrice +
          0.35 * (a.durationMinutes / minDuration) -
          (b.pricePerAdult / minPrice + 0.35 * (b.durationMinutes / minDuration)) ||
        byDeparture(a, b),
    };
    offers.sort(comparators[sort]);
  }

  private facets(offers: FlightOfferDto[]): AirlineFacetDto[] {
    const byAirline = new Map<string, AirlineFacetDto>();
    for (const offer of offers) {
      const facet = byAirline.get(offer.airline.code);
      if (facet) {
        facet.count += 1;
        facet.minPricePerAdult = Math.min(facet.minPricePerAdult, offer.pricePerAdult);
      } else {
        byAirline.set(offer.airline.code, {
          code: offer.airline.code,
          nameFa: offer.airline.nameFa,
          count: 1,
          minPricePerAdult: offer.pricePerAdult,
        });
      }
    }
    return [...byAirline.values()].sort((a, b) => a.minPricePerAdult - b.minPricePerAdult);
  }
}
