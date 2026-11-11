import {
  type CreateRoomHoldInput,
  diffDaysIso,
  HOTEL_HOLD_MINUTES,
  type HotelDetailDto,
  type HotelOfferDto,
  type HotelSearchQuery,
  type HotelSearchResultDto,
  type HotelStayQuery,
  isoDateRange,
  nightsBetween,
  type RoomHoldDto,
  type RoomOfferDto,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { parseObjectId } from "../../common/database/object-id.js";
import type { HotelRecord, HotelStay } from "../../infra/hotel/hotel.provider.js";
import { HotelProvider } from "../../infra/hotel/hotel.provider.js";
import { toHotelOffer, toRoomHold, toRoomOffer } from "./hotels.mapper.js";
import type { RoomHoldDocument } from "./schemas/room-hold.schema.js";
import { RoomHold } from "./schemas/room-hold.schema.js";

const stayNights = (stay: Pick<HotelStay, "checkIn" | "checkOut">): string[] =>
  isoDateRange(stay.checkIn, diffDaysIso(stay.checkOut, stay.checkIn));

@Injectable()
export class HotelsService {
  constructor(
    private readonly provider: HotelProvider,
    @InjectModel(RoomHold.name) private readonly holdModel: Model<RoomHoldDocument>,
    private readonly clock: Clock,
  ) {}

  async search(query: HotelSearchQuery): Promise<HotelSearchResultDto> {
    const hotels = await this.provider.search([query.city]);
    const offers: HotelOfferDto[] = [];
    for (const hotel of hotels) {
      const rooms = await this.roomOffers(hotel, query);
      if (!rooms.some((room) => room.roomsLeft >= query.rooms)) continue;
      offers.push(toHotelOffer(hotel, query, rooms));
    }

    const filtered = offers.filter(
      (offer) =>
        (query.minStars === undefined || offer.stars >= query.minStars) &&
        (query.maxTotal === undefined || offer.fromTotal <= query.maxTotal) &&
        (!query.breakfast || offer.breakfastAvailable) &&
        (!query.freeCancellation || offer.freeCancellationAvailable),
    );
    filtered.sort(SORTERS[query.sort]);
    return {
      hotels: filtered,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      nights: nightsBetween(query.checkIn, query.checkOut),
    };
  }

  async detail(hotelId: string, stay: HotelStayQuery): Promise<HotelDetailDto> {
    const hotel = await this.requireHotel(hotelId);
    const rooms = await this.roomOffers(hotel, stay);
    return { ...toHotelOffer(hotel, stay, rooms), rooms };
  }

  async hold(userId: string, input: CreateRoomHoldInput): Promise<RoomHoldDto> {
    const hotel = await this.requireHotel(input.hotelId);
    const room = (await this.roomOffers(hotel, input)).find((item) => item.id === input.roomId);
    if (!room || room.roomsLeft < input.rooms) {
      throw new AppException(409, "ROOM_UNAVAILABLE", "این اتاق برای تاریخ‌های شما دیگر خالی نیست");
    }
    if (room.total !== input.quotedTotal) {
      throw new AppException(409, "FARE_CHANGED", "قیمت این اتاق تغییر کرده است", {
        total: room.total,
      });
    }
    const hold = await this.holdModel.create({
      userId: new Types.ObjectId(userId),
      hotelId: hotel.id,
      roomId: room.id,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights: stayNights(input),
      rooms: input.rooms,
      total: room.total,
      expiresAt: new Date(this.clock.now().getTime() + HOTEL_HOLD_MINUTES * 60_000),
    });
    return toRoomHold(hold.toObject());
  }

  async releaseHold(userId: string, holdId: string): Promise<void> {
    const id = parseObjectId(holdId, "NOT_FOUND", "این نگه‌داری اتاق پیدا نشد");
    // Only an unpaid hold can be dropped here; paid rooms are cancelled through the booking
    const result = await this.holdModel.deleteOne({
      _id: id,
      userId: new Types.ObjectId(userId),
      expiresAt: { $ne: null },
    });
    if (result.deletedCount === 0) {
      throw new AppException(404, "NOT_FOUND", "این نگه‌داری اتاق پیدا نشد");
    }
  }

  private async requireHotel(hotelId: string): Promise<HotelRecord> {
    const hotel = await this.provider.find(hotelId);
    if (!hotel) throw new AppException(404, "HOTEL_NOT_FOUND", "هتل پیدا نشد");
    return hotel;
  }

  /** Rooms that fit the party, with what is left after our travellers' live holds. */
  private async roomOffers(hotel: HotelRecord, stay: HotelStay): Promise<RoomOfferDto[]> {
    const rates = await this.provider.rates(hotel, stay);
    const held = await this.heldRooms(
      rates.map((rate) => rate.id),
      stayNights(stay),
    );
    const now = this.clock.now();
    return rates.map((rate) => {
      // The supplier reports one count for the stay, so the busiest night of our holds decides
      const busiest = Math.max(
        0,
        ...rate.nightlyRates.map((night) => held.get(`${rate.id}|${night.date}`) ?? 0),
      );
      const left = rate.roomsLeft - busiest;
      return toRoomOffer(hotel, rate, stay, left, now);
    });
  }

  /** Rooms held per `roomId|night`, ignoring lapsed holds even before the TTL sweep. */
  private async heldRooms(roomIds: string[], nights: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (roomIds.length === 0) return result;
    const rows = await this.holdModel.aggregate<{
      _id: { roomId: string; night: string };
      rooms: number;
    }>([
      {
        $match: {
          roomId: { $in: roomIds },
          nights: { $in: nights },
          $or: [{ expiresAt: null }, { expiresAt: { $gt: this.clock.now() } }],
        },
      },
      { $unwind: "$nights" },
      { $match: { nights: { $in: nights } } },
      { $group: { _id: { roomId: "$roomId", night: "$nights" }, rooms: { $sum: "$rooms" } } },
    ]);
    for (const row of rows) result.set(`${row._id.roomId}|${row._id.night}`, row.rooms);
    return result;
  }
}

const SORTERS: Record<HotelSearchQuery["sort"], (a: HotelOfferDto, b: HotelOfferDto) => number> = {
  // Value for money: price per star, so a fair 4-star beats an overpriced 3-star
  recommended: (a, b) => a.fromTotal / a.stars - b.fromTotal / b.stars,
  price: (a, b) => a.fromTotal - b.fromTotal,
  stars: (a, b) => b.stars - a.stars || a.fromTotal - b.fromTotal,
  airport: (a, b) => a.distanceToAirportKm - b.distanceToAirportKm,
};
