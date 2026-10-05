import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Types } from "mongoose";
import { Model } from "mongoose";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import type { SeatHoldDocument } from "./schemas/seat-hold.schema.js";
import { SeatHold } from "./schemas/seat-hold.schema.js";

const DUPLICATE_KEY = 11000;

function isDuplicateKey(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: number; writeErrors?: Array<{ code?: number }> };
  return (
    candidate.code === DUPLICATE_KEY ||
    candidate.writeErrors?.some((item) => item.code === DUPLICATE_KEY) === true
  );
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(SeatHold.name) private readonly holdModel: Model<SeatHoldDocument>,
    private readonly clock: Clock,
  ) {}

  /** Seats currently held by our bookings, per flight. Expired holds are ignored even before TTL sweeps them. */
  async reservedSeats(flightIds: readonly string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>(flightIds.map((id) => [id, new Set<string>()]));
    if (flightIds.length === 0) return result;

    const holds = await this.holdModel
      .find({
        flightId: { $in: [...flightIds] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: this.clock.now() } }],
      })
      .lean();
    for (const hold of holds) result.get(hold.flightId)?.add(hold.seat);
    return result;
  }

  async holdSeats(
    session: ClientSession,
    bookingId: Types.ObjectId,
    holds: ReadonlyArray<{ flightId: string; seat: string }>,
    expiresAt: Date | null,
  ): Promise<void> {
    if (holds.length === 0) return;

    // A lapsed hold may still be waiting for the TTL sweep; clear it so the seat can be sold again
    await this.holdModel.deleteMany(
      {
        $or: holds.map((hold) => ({ flightId: hold.flightId, seat: hold.seat })),
        expiresAt: { $lte: this.clock.now() },
      },
      { session },
    );

    try {
      await this.holdModel.insertMany(
        holds.map((hold) => ({ ...hold, bookingId, expiresAt })),
        { session, ordered: true },
      );
    } catch (error: unknown) {
      if (isDuplicateKey(error)) {
        throw new AppException(
          409,
          "SEAT_UNAVAILABLE",
          "صندلی انتخاب‌شده همین الان توسط مسافر دیگری رزرو شد",
        );
      }
      throw error;
    }
  }

  async releaseFlightSeats(
    session: ClientSession,
    bookingId: Types.ObjectId,
    flightId: string,
  ): Promise<void> {
    await this.holdModel.deleteMany({ bookingId, flightId }, { session });
  }

  async releaseBooking(bookingId: Types.ObjectId, session?: ClientSession): Promise<void> {
    await this.holdModel.deleteMany({ bookingId }, session ? { session } : {});
  }

  async countBookingHolds(bookingId: Types.ObjectId, session?: ClientSession): Promise<number> {
    return this.holdModel.countDocuments({ bookingId }, session ? { session } : {});
  }

  /** Paid: seats stop expiring. */
  async confirmBooking(bookingId: Types.ObjectId, session?: ClientSession): Promise<void> {
    await this.holdModel.updateMany(
      { bookingId },
      { $set: { expiresAt: null } },
      session ? { session } : {},
    );
  }
}
