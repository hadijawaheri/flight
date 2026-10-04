import type { ApiResponse, BookingDto } from "@flysmart/contracts";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { BookingsService } from "./bookings.service.js";
import { CreateBookingDto } from "./dto/create-booking.dto.js";
import { UpdateBookingDto } from "./dto/update-booking.dto.js";

@Controller({ path: "bookings", version: "1" })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<ApiResponse<BookingDto[]>> {
    const data = await this.bookingsService.listByUser(user.id);
    return { data };
  }

  @Public()
  @Get(":id")
  async get(
    @CurrentUser() user: AuthUser | undefined,
    @Param("id") id: string,
  ): Promise<ApiResponse<BookingDto>> {
    const data = await this.bookingsService.getById(user?.id, id);
    return { data };
  }

  @Public()
  @Post()
  async create(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateBookingDto,
  ): Promise<ApiResponse<BookingDto>> {
    const data = await this.bookingsService.create(user?.id, dto);
    return { data };
  }

  @Public()
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser | undefined,
    @Param("id") id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<ApiResponse<BookingDto>> {
    const data = await this.bookingsService.update(user?.id, id, dto);
    return { data };
  }

  @Post(":id/cancel")
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<BookingDto>> {
    const data = await this.bookingsService.cancelBooking(user.id, id);
    return { data };
  }
}
