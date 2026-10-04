import type {
  ApiResponse,
  PaymentInitiateResponseDto,
  PaymentReceiptDto,
} from "@flysmart/contracts";
import { Body, Controller, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";
import { VerifyPaymentDto } from "./dto/verify-payment.dto.js";
import { PaymentsService } from "./payments.service.js";

@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post("initiate")
  async initiate(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: InitiatePaymentDto,
  ): Promise<ApiResponse<PaymentInitiateResponseDto>> {
    const data = await this.paymentsService.initiate(user?.id, dto);
    return { data };
  }

  @Public()
  @Post("verify")
  async verify(@Body() dto: VerifyPaymentDto): Promise<ApiResponse<PaymentReceiptDto>> {
    const data = await this.paymentsService.verify(dto);
    return { data };
  }
}
