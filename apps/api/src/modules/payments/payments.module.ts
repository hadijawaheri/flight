import { Module } from "@nestjs/common";

import { PaymentInfraModule } from "../../infra/payment/payment.module.js";
import { BookingsModule } from "../bookings/bookings.module.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";

@Module({
  imports: [PaymentInfraModule, BookingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
