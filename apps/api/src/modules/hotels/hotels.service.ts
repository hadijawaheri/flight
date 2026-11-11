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
  MAX_LIVE_ROOM_HOLDS,
  nightsBetween,
  type RoomHoldDto,
  type RoomOfferDto,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Connection } from "mongoose";
import { Model, Types } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { parseObjectId } from "../../common/database/object-id.js";
import type { HotelRecord, HotelStay } from "../../infra/hotel/hotel.provider.js";
import { HotelProvider } from "../../infra/hotel/hotel.provider.js";
import { toHotelOffer, toRoomHold, toRoomOffer } from "./hotels.mapper.js";
import type { RoomHoldDocument } from "./schemas/room-hold.schema.js";
import { RoomHold } from "./schemas/room-hold.schema.js";
import type { RoomNightLockDocument } from "./schemas/room-night-lock.schema.js";
import { RoomNightLock } from "./schemas/room-night-lock.schema.js";

const stayNights = (stay: Pick<HotelStay, "checkIn" | "checkOut">): string[] =>
  isoDateRange(stay.checkIn, diffDaysIso(stay.checkOut, stay.checkIn));

@Injectable()
export class HotelsService {
  constructor(
    private readonly provider: HotelProvider,
    @InjectModel(RoomHold.name) private readonly holdModel: Model<RoomHoldDocument>,
    @InjectModel(RoomNightLock.name) private readonly lockModel: Model<RoomNightLockDocument>,
    @InjectConnection() private readonly connection: Connection,
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
        (query.maxTotal === undefined || (offer.fromTotal ?? Infinity) <= query.maxTotal) &&
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
    const owner = new Types.ObjectId(userId);
    const nights = stayNights(input);
    let created: RoomHold | null = null;

    await this.inTransaction(async (session) => {
      const live = await this.holdModel.countDocuments(
        { userId: owner, expiresAt: { $gt: this.clock.now() } },
        { session },
      );
      if (live >= MAX_LIVE_ROOM_HOLDS) {
        throw new AppException(
          409,
          "CONFLICT",
          `حداکثر ${MAX_LIVE_ROOM_HOLDS} اتاق را می‌توانید هم‌زمان نگه دارید؛ یکی را پرداخت یا رها کنید`,
        );
      }
      // Touching one lock row per room night makes concurrent holds on the same night conflict,
      // so the transaction that loses retries and then sees the winner's hold in the count below
      await this.lockModel.bulkWrite(
        nights.map((night) => ({
          updateOne: {
            filter: { roomId: input.roomId, night },
            update: { $inc: { version: 1 } },
            upsert: true,
          },
        })),
        { session },
      );
      const room = (await this.roomOffers(hotel, input, session)).find(
        (item) => item.id === input.roomId,
      );
      if (!room || room.roomsLeft < input.rooms) {
        throw new AppException(
          409,
          "ROOM_UNAVAILABLE",
          "این اتاق برای تاریخ‌های شما دیگر خالی نیست",
        );
      }
      if (room.total !== input.quotedTotal) {
        throw new AppException(409, "FARE_CHANGED", "قیمت این اتاق تغییر کرده است", {
          total: room.total,
        });
      }
      const [doc] = await this.holdModel.create(
        [
          {
            userId: owner,
            hotelId: hotel.id,
            roomId: room.id,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            nights,
            rooms: input.rooms,
            total: room.total,
            expiresAt: new Date(this.clock.now().getTime() + HOTEL_HOLD_MINUTES * 60_000),
          },
        ],
        { session },
      );
      created = doc?.toObject() ?? null;
    });
    if (!created) throw new AppException(500, "INTERNAL", "نگه‌داری اتاق ثبت نشد");
    return toRoomHold(created);
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

  private async inTransaction(work: (session: ClientSession) => Promise<void>): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(work);
    } finally {
      await session.endSession();
    }
  }

  private async requireHotel(hotelId: string): Promise<HotelRecord> {
    const hotel = await this.provider.find(hotelId);
    if (!hotel) throw new AppException(404, "HOTEL_NOT_FOUND", "هتل پیدا نشد");
    return hotel;
  }

  /** Rooms that fit the party, with what is left after our travellers' live holds. */
  private async roomOffers(
    hotel: HotelRecord,
    stay: HotelStay,
    session?: ClientSession,
  ): Promise<RoomOfferDto[]> {
    const rates = await this.provider.rates(hotel, stay);
    const held = await this.heldRooms(
      rates.map((rate) => rate.id),
      stayNights(stay),
      session,
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
  private async heldRooms(
    roomIds: string[],
    nights: string[],
    session?: ClientSession,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (roomIds.length === 0) return result;
    const rows = await this.holdModel
      .aggregate<{
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
      ])
      .session(session ?? null);
    for (const row of rows) result.set(`${row._id.roomId}|${row._id.night}`, row.rooms);
    return result;
  }
}

// Search drops sold-out hotels, so null only matters for type safety here
const totalOf = (offer: HotelOfferDto): number => offer.fromTotal ?? Infinity;

const SORTERS: Record<HotelSearchQuery["sort"], (a: HotelOfferDto, b: HotelOfferDto) => number> = {
  // Value for money: price per star, so a fair 4-star beats an overpriced 3-star
  recommended: (a, b) => totalOf(a) / a.stars - totalOf(b) / b.stars,
  price: (a, b) => totalOf(a) - totalOf(b),
  stars: (a, b) => b.stars - a.stars || totalOf(a) - totalOf(b),
  airport: (a, b) => a.distanceToAirportKm - b.distanceToAirportKm,
};
