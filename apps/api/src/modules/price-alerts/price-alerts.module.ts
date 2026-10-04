import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FlightInfraModule } from "../../infra/flight/flight.module.js";
import { SmsModule } from "../../infra/sms/sms.module.js";
import { UsersModule } from "../users/users.module.js";
import { PriceAlertsController } from "./price-alerts.controller.js";
import { PriceAlertsService } from "./price-alerts.service.js";
import { PriceAlert, PriceAlertSchema } from "./schemas/price-alert.schema.js";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PriceAlert.name, schema: PriceAlertSchema }]),
    FlightInfraModule,
    UsersModule,
    SmsModule,
  ],
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService],
  exports: [PriceAlertsService],
})
export class PriceAlertsModule {}
