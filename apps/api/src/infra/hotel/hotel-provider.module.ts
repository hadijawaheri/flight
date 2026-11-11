import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { HotelProvider } from "./hotel.provider.js";
import { SimulatedHotelProvider } from "./simulated-hotel.provider.js";

// A real supplier (issue 18) is added here and selected by HOTEL_PROVIDER; unknown values fail at boot.
@Global()
@Module({
  providers: [
    {
      provide: HotelProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): HotelProvider => {
        const provider = config.get("HOTEL_PROVIDER", { infer: true });
        if (provider === "simulation") return new SimulatedHotelProvider();
        throw new Error(`Hotel provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [HotelProvider],
})
export class HotelProviderModule {}
