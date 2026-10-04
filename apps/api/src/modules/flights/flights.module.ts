import { Module } from "@nestjs/common";

import { FlightInfraModule } from "../../infra/flight/flight.module.js";
import { FlightsController } from "./flights.controller.js";
import { FlightsService } from "./flights.service.js";

@Module({
  imports: [FlightInfraModule],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {}
