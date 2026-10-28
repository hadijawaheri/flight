import { Module } from "@nestjs/common";

import { InventoryModule } from "../inventory/inventory.module.js";
import { PriceHistoryModule } from "../price-history/price-history.module.js";
import { FlightsController } from "./flights.controller.js";
import { FlightsService } from "./flights.service.js";

@Module({
  imports: [InventoryModule, PriceHistoryModule],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {}
