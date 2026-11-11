import type { ApiResponse, TransferQuoteDto } from "@flysmart/contracts";
import { Controller, Get, Query, Req } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthedRequest } from "../../common/types/auth.js";
import { TransferQuoteQueryDto } from "./dto/transfers.dto.js";
import { TransfersService } from "./transfers.service.js";

@Controller({ path: "transfers", version: "1" })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  // Public for a flight id; a booking id needs the signed-in owner, checked in the service
  @Public()
  @Get("quote")
  async quote(
    @Req() req: Partial<AuthedRequest>,
    @Query() query: TransferQuoteQueryDto,
  ): Promise<ApiResponse<TransferQuoteDto>> {
    return { data: await this.transfersService.quote(req.user?.id ?? null, query) };
  }
}
