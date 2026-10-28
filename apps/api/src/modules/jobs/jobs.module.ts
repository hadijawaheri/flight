import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module.js";
import { PriceAlertsModule } from "../price-alerts/price-alerts.module.js";
import { JobsController } from "./jobs.controller.js";

@Module({
  imports: [PriceAlertsModule, BookingsModule],
  controllers: [JobsController],
})
export class JobsModule {}
