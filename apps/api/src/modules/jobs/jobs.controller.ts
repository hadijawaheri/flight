import { Controller, Get, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../../common/decorators/public.decorator.js";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard.js";
import { BookingsExpirer } from "../bookings/bookings.expirer.js";
import { PriceAlertsService } from "../price-alerts/price-alerts.service.js";

// GET because Vercel Cron only sends GET. Both sweeps are idempotent: every write is a conditional
// claim, so a scheduler call overlapping the in-process timer cannot double-fire anything.
@Public()
@SkipThrottle()
@UseGuards(CronSecretGuard)
@Controller("jobs")
export class JobsController {
  constructor(
    private readonly alerts: PriceAlertsService,
    private readonly expirer: BookingsExpirer,
  ) {}

  @Get("price-alerts")
  async priceAlerts() {
    return { data: await this.alerts.checkAll() };
  }

  @Get("expire-bookings")
  async expireBookings() {
    return { data: { expired: await this.expirer.sweep() } };
  }
}
