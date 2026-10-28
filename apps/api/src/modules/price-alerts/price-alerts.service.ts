import type { Cabin, PriceAlertDto } from "@flysmart/contracts";
import {
  diffDaysIso,
  expandAirportCode,
  formatToman,
  getRoute,
  isoToJalali,
  JALALI_MONTH_NAMES,
  locationLabel,
  MAX_ACTIVE_ALERTS,
  MAX_ALERT_SMS_ATTEMPTS,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type QueryFilter, Types } from "mongoose";
import { PinoLogger } from "nestjs-pino";

import { AppException } from "../../common/app-exception.js";
import { Clock } from "../../common/clock/clock.js";
import { parseObjectId } from "../../common/database/object-id.js";
import { SALES_HORIZON_DAYS } from "../../infra/flight/simulation/pricing-model.js";
import { SmsProvider } from "../../infra/sms/sms.provider.js";
import { FlightsService } from "../flights/flights.service.js";
import { UsersService } from "../users/users.service.js";
import type { CreatePriceAlertDto, UpdatePriceAlertDto } from "./dto/price-alerts.dto.js";
import type { PriceAlertDocument } from "./schemas/price-alert.schema.js";
import { PriceAlert } from "./schemas/price-alert.schema.js";

const NOT_FOUND = "هشدار قیمت یافت نشد";
const MAX_PER_SWEEP = 500;
// A text about a fare from yesterday is noise; after this the attempt is abandoned
const SMS_RETRY_WINDOW_MS = 24 * 60 * 60_000;
// An attempt still PENDING after this died with its process and may be taken over
const SMS_LEASE_MS = 10 * 60_000;
const SMS_RESET = {
  smsStatus: null,
  smsAttempts: 0,
  smsClaimedAt: null,
  smsSentAt: null,
  smsLastError: null,
};

const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function jalaliDayMonth(iso: string): string {
  const { month, day } = isoToJalali(iso);
  return `${faDigits.format(day)} ${JALALI_MONTH_NAMES[month - 1] ?? ""}`;
}

type Lookup = { pricePerAdult: number; flightId: string } | null;

function routeExists(origin: string, destination: string): boolean {
  return expandAirportCode(origin).some((from) =>
    expandAirportCode(destination).some((to) => getRoute(from, to) !== undefined),
  );
}

@Injectable()
export class PriceAlertsService {
  constructor(
    @InjectModel(PriceAlert.name) private readonly alertModel: Model<PriceAlertDocument>,
    private readonly flights: FlightsService,
    private readonly users: UsersService,
    private readonly sms: SmsProvider,
    private readonly clock: Clock,
    private readonly logger: PinoLogger,
  ) {}

  async list(userId: string): Promise<PriceAlertDto[]> {
    const alerts = await this.alertModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ status: 1, date: 1 })
      .lean();
    const cache = new Map<string, Lookup>();
    const result: PriceAlertDto[] = [];
    for (const alert of alerts) {
      const live = alert.status !== "EXPIRED" && alert.date >= this.clock.today();
      result.push(this.toDto(alert, live ? await this.lowest(alert, cache) : null));
    }
    return result;
  }

  async create(userId: string, dto: CreatePriceAlertDto): Promise<PriceAlertDto> {
    const today = this.clock.today();
    if (dto.date < today) throw new AppException(400, "VALIDATION_FAILED", "تاریخ پرواز گذشته است");
    if (diffDaysIso(dto.date, today) > SALES_HORIZON_DAYS) {
      throw new AppException(
        400,
        "VALIDATION_FAILED",
        "فروش بلیت برای این تاریخ هنوز آغاز نشده است",
      );
    }
    if (!routeExists(dto.origin, dto.destination)) {
      throw new AppException(400, "VALIDATION_FAILED", "برای این مسیر پرواز مستقیمی وجود ندارد");
    }

    const owner = new Types.ObjectId(userId);
    const active = await this.alertModel.countDocuments({ userId: owner, status: "ACTIVE" });
    if (active >= MAX_ACTIVE_ALERTS) {
      throw new AppException(409, "CONFLICT", `حداکثر ${MAX_ACTIVE_ALERTS} هشدار فعال مجاز است`);
    }
    const duplicate = await this.alertModel.exists({
      userId: owner,
      origin: dto.origin,
      destination: dto.destination,
      date: dto.date,
      cabin: dto.cabin,
      status: "ACTIVE",
    });
    if (duplicate)
      throw new AppException(409, "CONFLICT", "برای این مسیر و تاریخ هشدار فعال دارید");

    const created = await this.alertModel.create({ ...dto, userId: owner });
    const cache = new Map<string, Lookup>();
    // A fare already at or below the target should not wait for the next sweep
    await this.evaluate(created.toObject(), cache);
    const fresh = await this.alertModel.findById(created._id).lean();
    return this.toDto(fresh as PriceAlert, await this.lowest(fresh as PriceAlert, cache));
  }

  async update(userId: string, id: string, dto: UpdatePriceAlertDto): Promise<PriceAlertDto> {
    const alertId = parseObjectId(id, "PRICE_ALERT_NOT_FOUND", NOT_FOUND);
    const updated = await this.alertModel
      .findOneAndUpdate(
        { _id: alertId, userId: new Types.ObjectId(userId), status: { $ne: "EXPIRED" } },
        // Changing the target re-arms an alert that already fired
        {
          $set: {
            targetPrice: dto.targetPrice,
            status: "ACTIVE",
            triggeredAt: null,
            triggeredPrice: null,
            triggeredFlightId: null,
            ...SMS_RESET,
          },
        },
        { returnDocument: "after" },
      )
      .lean();
    if (!updated) throw new AppException(404, "PRICE_ALERT_NOT_FOUND", NOT_FOUND);

    const cache = new Map<string, Lookup>();
    await this.evaluate(updated, cache);
    const fresh = (await this.alertModel.findById(alertId).lean()) as PriceAlert;
    return this.toDto(fresh, await this.lowest(fresh, cache));
  }

  async remove(userId: string, id: string): Promise<void> {
    const alertId = parseObjectId(id, "PRICE_ALERT_NOT_FOUND", NOT_FOUND);
    const result = await this.alertModel.updateOne(
      { _id: alertId, userId: new Types.ObjectId(userId) },
      { $set: { deletedAt: new Date() } },
    );
    if (result.matchedCount === 0) throw new AppException(404, "PRICE_ALERT_NOT_FOUND", NOT_FOUND);
  }

  /** One pass of the watcher: expire stale alerts and fire the ones whose price has been reached. */
  async checkAll(): Promise<{ checked: number; triggered: number; smsRetried: number }> {
    const today = this.clock.today();
    await this.alertModel.updateMany(
      { status: "ACTIVE", date: { $lt: today } },
      { $set: { status: "EXPIRED" } },
    );

    const alerts = await this.alertModel
      .find({ status: "ACTIVE" })
      .sort({ date: 1 })
      .limit(MAX_PER_SWEEP)
      .lean();
    const cache = new Map<string, Lookup>();
    let triggered = 0;
    for (const alert of alerts) {
      if (await this.evaluate(alert, cache)) triggered += 1;
    }
    return { checked: alerts.length, triggered, smsRetried: await this.retrySms() };
  }

  /** Re-sends texts that failed (operator down, timeout) or whose sender crashed mid-attempt. */
  async retrySms(): Promise<number> {
    const now = this.clock.now();
    const due = await this.alertModel
      .find({
        status: "TRIGGERED",
        date: { $gte: this.clock.today() },
        triggeredAt: { $gte: new Date(now.getTime() - SMS_RETRY_WINDOW_MS) },
        smsAttempts: { $lt: MAX_ALERT_SMS_ATTEMPTS },
        $or: [
          { smsStatus: "FAILED" },
          { smsStatus: "PENDING", smsClaimedAt: { $lt: new Date(now.getTime() - SMS_LEASE_MS) } },
        ],
      })
      .limit(MAX_PER_SWEEP)
      .lean();

    let retried = 0;
    for (const alert of due) {
      // Conditional on the state just read, so two sweeps never both send the same text
      const claimed = await this.claimSms(alert._id, {
        smsStatus: alert.smsStatus,
        smsAttempts: alert.smsAttempts,
        smsClaimedAt: alert.smsClaimedAt,
      });
      if (!claimed) continue;
      await this.sendSms(claimed);
      retried += 1;
    }
    return retried;
  }

  private async evaluate(alert: PriceAlert, cache: Map<string, Lookup>): Promise<boolean> {
    if (alert.status !== "ACTIVE") return false;
    const found = await this.lowest(alert, cache);
    if (!found || found.pricePerAdult > alert.targetPrice) return false;

    // Conditional update: two sweeps (or a sweep and a create) must not both notify. The
    // first SMS attempt is claimed in the same write.
    const now = this.clock.now();
    const triggered = await this.alertModel
      .findOneAndUpdate(
        { _id: alert._id, status: "ACTIVE" },
        {
          $set: {
            status: "TRIGGERED",
            triggeredAt: now,
            triggeredPrice: found.pricePerAdult,
            triggeredFlightId: found.flightId,
            ...SMS_RESET,
            smsStatus: "PENDING",
            smsAttempts: 1,
            smsClaimedAt: now,
          },
        },
        { returnDocument: "after" },
      )
      .lean();
    if (!triggered) return false;

    await this.sendSms(triggered);
    return true;
  }

  private async claimSms(
    id: Types.ObjectId,
    seen: Pick<PriceAlert, "smsStatus" | "smsAttempts" | "smsClaimedAt">,
  ): Promise<PriceAlert | null> {
    const filter: QueryFilter<PriceAlertDocument> = {
      _id: id,
      status: "TRIGGERED",
      smsStatus: seen.smsStatus,
      smsAttempts: seen.smsAttempts,
      smsClaimedAt: seen.smsClaimedAt,
    };
    return this.alertModel
      .findOneAndUpdate(
        filter,
        {
          $set: { smsStatus: "PENDING", smsClaimedAt: this.clock.now() },
          $inc: { smsAttempts: 1 },
        },
        { returnDocument: "after" },
      )
      .lean();
  }

  /** Sends one claimed attempt and records the outcome; never throws into the trigger path. */
  private async sendSms(alert: PriceAlert): Promise<void> {
    let outcome: Partial<PriceAlert>;
    try {
      const user = await this.users.getById(alert.userId.toString());
      const delivery = await this.sms.sendPriceAlert(user.mobile, {
        route: `${locationLabel(alert.origin)} به ${locationLabel(alert.destination)}`,
        date: jalaliDayMonth(alert.date),
        price: formatToman(alert.triggeredPrice ?? alert.targetPrice),
      });
      outcome =
        delivery === "SENT"
          ? { smsStatus: "SENT", smsSentAt: this.clock.now(), smsLastError: null }
          : { smsStatus: "SKIPPED", smsLastError: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        { alertId: alert._id.toString(), attempt: alert.smsAttempts, err: error },
        "Price alert SMS failed",
      );
      outcome = { smsStatus: "FAILED", smsLastError: message.slice(0, 300) };
    }
    // Scoped to this attempt: a re-armed or deleted alert must not get a stale outcome
    await this.alertModel.updateOne(
      { _id: alert._id, smsStatus: "PENDING", smsAttempts: alert.smsAttempts },
      { $set: outcome },
    );
  }

  private async lowest(
    alert: Pick<PriceAlert, "origin" | "destination" | "date" | "cabin">,
    cache: Map<string, Lookup>,
  ): Promise<Lookup> {
    const key = [alert.origin, alert.destination, alert.date, alert.cabin].join("|");
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    let best: Lookup = null;
    for (const from of expandAirportCode(alert.origin)) {
      for (const to of expandAirportCode(alert.destination)) {
        const found = await this.flights.cheapestFor(from, to, alert.date, alert.cabin as Cabin);
        if (found && (best === null || found.pricePerAdult < best.pricePerAdult)) {
          best = { pricePerAdult: found.pricePerAdult, flightId: found.record.id };
        }
      }
    }
    cache.set(key, best);
    return best;
  }

  private toDto(alert: PriceAlert, lowest: Lookup): PriceAlertDto {
    return {
      id: alert._id.toString(),
      origin: alert.origin,
      destination: alert.destination,
      originCityFa: locationLabel(alert.origin),
      destinationCityFa: locationLabel(alert.destination),
      date: alert.date,
      cabin: alert.cabin,
      targetPrice: alert.targetPrice,
      currentLowestPrice: lowest ? lowest.pricePerAdult : null,
      status: alert.status,
      triggeredAt: alert.triggeredAt ? alert.triggeredAt.toISOString() : null,
      triggeredPrice: alert.triggeredPrice,
      triggeredFlightId: alert.triggeredFlightId,
      sms: alert.smsStatus
        ? {
            status: alert.smsStatus,
            sentAt: alert.smsSentAt ? alert.smsSentAt.toISOString() : null,
          }
        : null,
      createdAt: alert.createdAt.toISOString(),
    };
  }
}
