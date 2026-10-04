import { Module } from "@nestjs/common";

import { MockPaymentProvider } from "./mock-payment.provider.js";
import { PaymentProvider } from "./payment.provider.js";

@Module({
  providers: [
    {
      provide: PaymentProvider,
      useClass: MockPaymentProvider,
    },
  ],
  exports: [PaymentProvider],
})
export class PaymentInfraModule {}
