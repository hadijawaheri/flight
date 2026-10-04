import { Module } from "@nestjs/common";

import { FlightProvider } from "./flight.provider.js";
import { MockFlightProvider } from "./mock-flight.provider.js";

@Module({
  providers: [
    {
      provide: FlightProvider,
      useClass: MockFlightProvider,
    },
  ],
  exports: [FlightProvider],
})
export class FlightInfraModule {}
