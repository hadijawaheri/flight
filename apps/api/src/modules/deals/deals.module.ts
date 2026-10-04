import { Module } from "@nestjs/common";

import { FlightInfraModule } from "../../infra/flight/flight.module.js";
import { DealsController } from "./deals.controller.js";
import { DealsService } from "./deals.service.js";

@Module({
  imports: [FlightInfraModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
