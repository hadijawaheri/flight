import { Module } from "@nestjs/common";

import { FlightsModule } from "../flights/flights.module.js";
import { DealsController } from "./deals.controller.js";
import { DealsService } from "./deals.service.js";

@Module({
  imports: [FlightsModule],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
