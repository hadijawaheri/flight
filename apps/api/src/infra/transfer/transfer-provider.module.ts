import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { SimulatedTransferProvider } from "./simulated-transfer.provider.js";
import { TransferProvider } from "./transfer.provider.js";

// A real supplier is added here and selected by TRANSFER_PROVIDER; unknown values fail at boot.
@Global()
@Module({
  providers: [
    {
      provide: TransferProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TransferProvider => {
        const provider = config.get("TRANSFER_PROVIDER", { infer: true });
        if (provider === "simulation") return new SimulatedTransferProvider();
        throw new Error(`Transfer provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [TransferProvider],
})
export class TransferProviderModule {}
