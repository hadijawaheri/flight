import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { MockPaymentProvider } from "./mock-payment.provider.js";
import { PaymentProvider } from "./payment.provider.js";

// A real gateway (e.g. Zarinpal) is added here and selected by PAYMENT_PROVIDER.
// An unimplemented provider must fail at boot rather than fall back to the mock.
@Global()
@Module({
  providers: [
    {
      provide: PaymentProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PaymentProvider => {
        const provider = config.get("PAYMENT_PROVIDER", { infer: true });
        if (provider === "mock") return new MockPaymentProvider();
        throw new Error(`Payment provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [PaymentProvider],
})
export class PaymentProviderModule {}
