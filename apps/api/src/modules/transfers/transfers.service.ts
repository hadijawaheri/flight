import {
  type Airport,
  distanceKm,
  getAirport,
  pickupTimeFor,
  type TransferDirection,
  type TransferOfferDto,
  type TransferQuoteDto,
  type TransferQuoteQuery,
  utcToLocalString,
  VEHICLES,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { FlightProvider } from "../../infra/flight/flight.provider.js";
import { HotelProvider } from "../../infra/hotel/hotel.provider.js";
import type { TransferZoneRecord } from "../../infra/transfer/transfer.provider.js";
import { TransferProvider } from "../../infra/transfer/transfer.provider.js";
import { BookingsService } from "../bookings/bookings.service.js";

/** The parts of a flight a transfer depends on, whether it came from search or from a booking. */
interface TransferFlight {
  id: string;
  departureUtc: Date;
  arrivalUtc: Date;
  international: boolean;
  origin: Airport;
  destination: Airport;
}

interface Endpoint {
  zone: TransferZoneRecord;
  placeFa: string;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly flights: FlightProvider,
    private readonly hotels: HotelProvider,
    private readonly transfers: TransferProvider,
    private readonly bookings: BookingsService,
    private readonly clock: Clock,
  ) {}

  async quote(userId: string | null, query: TransferQuoteQuery): Promise<TransferQuoteDto> {
    const flight = await this.resolveFlight(userId, query);
    const airport = query.direction === "FROM_AIRPORT" ? flight.destination : flight.origin;
    if (airport.countryCode !== "IR") {
      throw new AppException(
        400,
        "VALIDATION_FAILED",
        "ترانسفر فعلاً فقط در فرودگاه‌های داخلی است",
      );
    }
    const endpoint = await this.resolveEndpoint(airport, query);
    const pickupAt = pickupTimeFor(flight, query.direction, endpoint.zone.driveMinutes);
    // The ride must still be ahead: a pickup that has passed cannot be booked
    if (pickupAt.getTime() <= this.clock.now().getTime()) {
      throw new AppException(409, "FLIGHT_DEPARTED", "زمان سوار شدن این ترانسفر گذشته است");
    }

    const rates = await this.transfers.rates({
      zone: endpoint.zone,
      direction: query.direction,
      pickupAt,
      passengers: query.passengers,
      bags: query.bags,
    });
    const airportPlace = `فرودگاه ${airport.nameFa} ${airport.cityFa}`;
    const pickupPlaceFa =
      query.direction === "FROM_AIRPORT" ? `سالن ورودی ${airportPlace}` : endpoint.placeFa;
    const dropoffPlaceFa = query.direction === "FROM_AIRPORT" ? endpoint.placeFa : airportPlace;

    const offers: TransferOfferDto[] = rates
      .map((rate) => ({
        id: `${endpoint.zone.id}-${query.direction}-${rate.vehicle}-${flight.id}`,
        direction: query.direction,
        vehicle: rate.vehicle,
        vehicleNameFa: VEHICLES[rate.vehicle].nameFa,
        maxPassengers: VEHICLES[rate.vehicle].maxPassengers,
        maxBags: VEHICLES[rate.vehicle].maxBags,
        price: rate.price,
        pickupAt: pickupAt.toISOString(),
        pickupLocalTime: utcToLocalString(pickupAt, airport.utcOffsetMinutes),
        pickupPlaceFa,
        dropoffPlaceFa,
        freeWaitingMinutes: rate.freeWaitingMinutes,
        cancellationPolicy: rate.cancellationPolicy,
      }))
      .sort((a, b) => a.price - b.price);

    return {
      direction: query.direction,
      flightId: flight.id,
      airportCode: airport.code,
      zone: {
        id: endpoint.zone.id,
        nameFa: endpoint.zone.nameFa,
        airportCode: endpoint.zone.airportCode,
        distanceKm: endpoint.zone.distanceKm,
      },
      offers,
    };
  }

  private async resolveFlight(
    userId: string | null,
    query: TransferQuoteQuery,
  ): Promise<TransferFlight> {
    if (query.flightId) {
      const record = await this.flights.find(query.flightId);
      if (!record) throw new AppException(404, "FLIGHT_NOT_FOUND", "پرواز پیدا نشد");
      return record;
    }
    if (!userId) throw new AppException(401, "UNAUTHENTICATED", "لطفاً وارد حساب خود شوید");
    const booking = await this.bookings.get(userId, query.bookingId ?? "");
    const slice = pickSlice(booking.slices, query.direction);
    const origin = getAirport(slice.flight.origin.airportCode);
    const destination = getAirport(slice.flight.destination.airportCode);
    if (!origin || !destination) throw new AppException(404, "FLIGHT_NOT_FOUND", "پرواز پیدا نشد");
    return {
      id: slice.flight.id,
      departureUtc: new Date(slice.flight.departureUtc),
      arrivalUtc: new Date(slice.flight.arrivalUtc),
      international: slice.flight.international,
      origin,
      destination,
    };
  }

  private async resolveEndpoint(airport: Airport, query: TransferQuoteQuery): Promise<Endpoint> {
    if (query.zoneId) {
      const zone = await this.transfers.findZone(query.zoneId);
      if (!zone || zone.airportCode !== airport.code) {
        throw new AppException(400, "VALIDATION_FAILED", "این منطقه به این فرودگاه نمی‌خورد");
      }
      return { zone, placeFa: zone.nameFa };
    }
    const hotel = await this.hotels.find(query.hotelId ?? "");
    if (!hotel) throw new AppException(404, "HOTEL_NOT_FOUND", "هتل پیدا نشد");
    const hotelAirport = getAirport(hotel.airportCode);
    if (!hotelAirport || hotelAirport.cityEn !== airport.cityEn) {
      throw new AppException(400, "VALIDATION_FAILED", "این هتل در شهر این فرودگاه نیست");
    }
    // A hotel measured from the city's other airport (IKA vs THR) is that far plus the gap between them
    const extra = hotelAirport.code === airport.code ? 0 : distanceKm(hotelAirport, airport);
    const zone = await this.transfers.zoneForDistance(
      airport.code,
      hotel.distanceToAirportKm + extra,
    );
    if (!zone) throw new AppException(400, "VALIDATION_FAILED", "برای این فرودگاه ترانسفر نداریم");
    return { zone, placeFa: `${hotel.nameFa}، ${hotel.addressFa}` };
  }
}

/** From the airport meets the outbound arrival; to the airport catches the return, or the outbound one-way. */
function pickSlice<T extends { direction: "OUTBOUND" | "RETURN" }>(
  slices: readonly T[],
  direction: TransferDirection,
): T {
  const outbound = slices.find((slice) => slice.direction === "OUTBOUND");
  const inbound = slices.find((slice) => slice.direction === "RETURN");
  const chosen = direction === "TO_AIRPORT" ? (inbound ?? outbound) : outbound;
  if (!chosen) throw new AppException(404, "BOOKING_NOT_FOUND", "رزرو پیدا نشد");
  return chosen;
}
