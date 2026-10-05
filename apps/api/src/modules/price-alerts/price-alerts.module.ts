import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FlightsModule } from "../flights/flights.module.js";
import { UsersModule } from "../users/users.module.js";
import { PriceAlertsController } from "./price-alerts.controller.js";
import { PriceAlertsService } from "./price-alerts.service.js";
import { PriceAlertsWatcher } from "./price-alerts.watcher.js";
import { PriceAlert, PriceAlertSchema } from "./schemas/price-alert.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceAlert.name, schema: PriceAlertSchema }]),
    FlightsModule,
    UsersModule,
  ],
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService, PriceAlertsWatcher],
  exports: [PriceAlertsService],
})
export class PriceAlertsModule {}
