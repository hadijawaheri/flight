import type {
  ApiResponse,
  HotelDetailDto,
  HotelSearchResultDto,
  RoomHoldDto,
} from "@flysmart/contracts";
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { CreateRoomHoldDto, HotelSearchQueryDto, HotelStayQueryDto } from "./dto/hotels.dto.js";
import { HotelsService } from "./hotels.service.js";

@Controller({ path: "hotels", version: "1" })
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Public()
  @Get("search")
  async search(@Query() query: HotelSearchQueryDto): Promise<ApiResponse<HotelSearchResultDto>> {
    return { data: await this.hotelsService.search(query) };
  }

  @Post("holds")
  async hold(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRoomHoldDto,
  ): Promise<ApiResponse<RoomHoldDto>> {
    return { data: await this.hotelsService.hold(user.id, dto) };
  }

  @Delete("holds/:holdId")
  @HttpCode(204)
  async releaseHold(@CurrentUser() user: AuthUser, @Param("holdId") holdId: string): Promise<void> {
    await this.hotelsService.releaseHold(user.id, holdId);
  }

  // Declared after the literal routes so "search" and "holds" are never read as hotel ids
  @Public()
  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Query() query: HotelStayQueryDto,
  ): Promise<ApiResponse<HotelDetailDto>> {
    return { data: await this.hotelsService.detail(id, query) };
  }
}
