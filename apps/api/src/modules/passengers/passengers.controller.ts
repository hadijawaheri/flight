import type { ApiResponse, PassengerDto } from "@flysmart/contracts";
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { CreatePassengerDto } from "./dto/create-passenger.dto.js";
import { UpdatePassengerDto } from "./dto/update-passenger.dto.js";
import { PassengersService } from "./passengers.service.js";

@Controller({ path: "passengers", version: "1" })
export class PassengersController {
  constructor(private readonly passengersService: PassengersService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<PassengerDto[]>> {
    const data = await this.passengersService.listByUser(user.id);
    return { data };
  }

  @Get(":id")
  async get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<PassengerDto>> {
    const data = await this.passengersService.getById(user.id, id);
    return { data };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePassengerDto,
  ): Promise<ApiResponse<PassengerDto>> {
    const data = await this.passengersService.create(user.id, dto);
    return { data };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdatePassengerDto,
  ): Promise<ApiResponse<PassengerDto>> {
    const data = await this.passengersService.update(user.id, id, dto);
    return { data };
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.passengersService.delete(user.id, id);
  }
}
