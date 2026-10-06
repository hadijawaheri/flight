import type { ApiResponse, PassengerDto } from "@flysmart/contracts";
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { CreatePassengerDto, UpdatePassengerDto } from "./dto/passenger.dto.js";
import { PassengersService } from "./passengers.service.js";

@Controller({ path: "passengers", version: "1" })
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<PassengerDto[]>> {
    return { data: await this.passengersService.list(user.id) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePassengerDto,
  ): Promise<ApiResponse<PassengerDto>> {
    return { data: await this.passengersService.create(user.id, dto) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdatePassengerDto,
  ): Promise<ApiResponse<PassengerDto>> {
    return { data: await this.passengersService.update(user.id, id, dto) };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.passengersService.remove(user.id, id);
  }
}
