import type { ApiResponse, PriceAlertDto } from "@flysmart/contracts";
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { CreatePriceAlertDto } from "./dto/create-price-alert.dto.js";
import { PriceAlertsService } from "./price-alerts.service.js";

@Controller({ path: "price-alerts", version: "1" })
export class PriceAlertsController {
  constructor(private readonly priceAlertsService: PriceAlertsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<PriceAlertDto[]>> {
    const data = await this.priceAlertsService.listByUser(user.id);
    return { data };
  }

  @Public()
  @Post()
  async create(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreatePriceAlertDto,
  ): Promise<ApiResponse<PriceAlertDto>> {
    const data = await this.priceAlertsService.create(user?.id, dto);
    return { data };
  }

  @Patch(":id/toggle")
  async toggle(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<PriceAlertDto>> {
    const data = await this.priceAlertsService.toggleActive(user.id, id);
    return { data };
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.priceAlertsService.delete(user.id, id);
  }
}
