import {
  freeCancellationUntil,
  type HotelOfferDto,
  nightsBetween,
  type RoomHoldDto,
  type RoomOfferDto,
  utcToLocalString,
} from "@flysmart/contracts";

import type { HotelRecord, HotelStay, RoomRateRecord } from "../../infra/hotel/hotel.provider.js";
import type { RoomHold } from "./schemas/room-hold.schema.js";

export function roomTotal(rate: RoomRateRecord, rooms: number): number {
  return rate.nightlyRates.reduce((sum, night) => sum + night.amount, 0) * rooms;
}

export function toRoomOffer(
  hotel: HotelRecord,
  rate: RoomRateRecord,
  stay: HotelStay,
  roomsLeft: number,
  now: Date,
): RoomOfferDto {
  const until = freeCancellationUntil(
    rate.cancellationPolicy,
    stay.checkIn,
    hotel.checkInTime,
    hotel.utcOffsetMinutes,
  );
  // A deadline that has already passed must not be advertised as free cancellation
  const stillFree = until !== null && until > utcToLocalString(now, hotel.utcOffsetMinutes);
  return {
    id: rate.id,
    nameFa: rate.nameFa,
    bed: rate.bed,
    maxOccupancy: rate.maxOccupancy,
    mealPlan: rate.mealPlan,
    nightlyRates: rate.nightlyRates,
    total: roomTotal(rate, stay.rooms),
    cancellationPolicy: rate.cancellationPolicy,
    freeCancellationUntil: stillFree ? until : null,
    roomsLeft: Math.max(0, roomsLeft),
  };
}

export function toHotelOffer(
  hotel: HotelRecord,
  stay: HotelStay,
  rooms: readonly RoomOfferDto[],
): HotelOfferDto {
  const sellable = rooms.filter((room) => room.roomsLeft >= stay.rooms);
  return {
    id: hotel.id,
    nameFa: hotel.nameFa,
    nameEn: hotel.nameEn,
    stars: hotel.stars,
    cityFa: hotel.cityFa,
    airportCode: hotel.airportCode,
    neighbourhoodFa: hotel.neighbourhoodFa,
    addressFa: hotel.addressFa,
    distanceToAirportKm: hotel.distanceToAirportKm,
    distanceToCenterKm: hotel.distanceToCenterKm,
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    amenitiesFa: hotel.amenitiesFa,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    nights: nightsBetween(stay.checkIn, stay.checkOut),
    fromTotal: Math.min(...sellable.map((room) => room.total)),
    breakfastAvailable: sellable.some((room) => room.mealPlan !== "ROOM_ONLY"),
    freeCancellationAvailable: sellable.some((room) => room.freeCancellationUntil !== null),
  };
}

export function toRoomHold(hold: RoomHold): RoomHoldDto {
  return {
    id: String(hold._id),
    hotelId: hold.hotelId,
    roomId: hold.roomId,
    checkIn: hold.checkIn,
    checkOut: hold.checkOut,
    rooms: hold.rooms,
    total: hold.total,
    expiresAt: (hold.expiresAt ?? hold.createdAt).toISOString(),
  };
}
