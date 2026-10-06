import type { ApiResponse, PaymentConfigDto } from "@flysmart/contracts";
import { Controller, Get } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import { PaymentsService } from "./payments.service.js";

@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get("config")
  config(): ApiResponse<PaymentConfigDto> {
    return { data: this.paymentsService.config() };
  }
}
