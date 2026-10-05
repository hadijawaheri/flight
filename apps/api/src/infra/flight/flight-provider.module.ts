import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Clock } from "../../common/clock/clock.js";
import type { Env } from "../../config/env.js";
import { FlightProvider } from "./flight.provider.js";
import { SimulatedFlightProvider } from "./simulated-flight.provider.js";

// A real aggregator is added here and selected by FLIGHT_PROVIDER; unknown values fail at boot.
@Global()
@Module({
  providers: [
    {
      provide: FlightProvider,
      inject: [ConfigService, Clock],
      useFactory: (config: ConfigService<Env, true>, clock: Clock): FlightProvider => {
        const provider = config.get("FLIGHT_PROVIDER", { infer: true });
        if (provider === "simulation") return new SimulatedFlightProvider(clock);
        throw new Error(`Flight provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [FlightProvider],
})
export class FlightProviderModule {}
