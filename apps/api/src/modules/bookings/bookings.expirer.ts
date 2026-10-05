import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PinoLogger } from "nestjs-pino";

import { Clock } from "../../common/clock/clock.js";
import type { Env } from "../../config/env.js";
import { InventoryService } from "../inventory/inventory.service.js";
import type { BookingDocument } from "./schemas/booking.schema.js";
import { Booking } from "./schemas/booking.schema.js";

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Marks unpaid bookings as expired and frees their seats. Readers already treat a lapsed hold as
 * expired (see effectiveStatus), so this sweep is housekeeping, not correctness.
 */
@Injectable()
export class BookingsExpirer implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    private readonly inventory: InventoryService,
    private readonly clock: Clock,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    if (!this.config.get("BOOKING_EXPIRER_ENABLED", { infer: true })) return;
    this.timer = setInterval(() => {
      this.sweep().catch((error: unknown) =>
        this.logger.error({ err: error }, "Booking expiry sweep failed"),
      );
    }, SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<number> {
    const now = this.clock.now();
    const lapsed = await this.bookingModel
      .find({ status: "PENDING_PAYMENT", holdExpiresAt: { $lte: now } })
      .select({ _id: 1 })
      .limit(500)
      .lean();
    for (const booking of lapsed) {
      const result = await this.bookingModel.updateOne(
        { _id: booking._id, status: "PENDING_PAYMENT", holdExpiresAt: { $lte: now } },
        { $set: { status: "EXPIRED" } },
      );
      if (result.matchedCount === 1) await this.inventory.releaseBooking(booking._id);
    }
    return lapsed.length;
  }
}
