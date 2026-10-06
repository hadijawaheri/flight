import type { ApiResponse, PriceAlertDto } from "@flysmart/contracts";
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { CreatePriceAlertDto, UpdatePriceAlertDto } from "./dto/price-alerts.dto.js";
import { PriceAlertsService } from "./price-alerts.service.js";

@Controller({ path: "price-alerts", version: "1" })
export class PriceAlertsController {
  constructor(private readonly alertsService: PriceAlertsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<PriceAlertDto[]>> {
    return { data: await this.alertsService.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePriceAlertDto,
  ): Promise<ApiResponse<PriceAlertDto>> {
    return { data: await this.alertsService.create(user.id, dto) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdatePriceAlertDto,
  ): Promise<ApiResponse<PriceAlertDto>> {
    return { data: await this.alertsService.update(user.id, id, dto) };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.alertsService.remove(user.id, id);
  }
}
