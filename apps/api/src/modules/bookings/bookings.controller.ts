import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type {
  ApiResponse,
  BookingDto,
  BookingListItemDto,
  PaginatedResponse,
  PayBookingResultDto,
  RefundQuoteDto,
} from "@flysmart/contracts";

import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { BookingsService } from "./bookings.service.js";
import {
  AssignSeatsDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  PayBookingDto,
} from "./dto/bookings.dto.js";

@Controller({ path: "bookings", version: "1" })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListBookingsQueryDto,
  ): Promise<PaginatedResponse<BookingListItemDto>> {
    return this.bookingsService.list(user.id, query);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ): Promise<ApiResponse<BookingDto>> {
    return { data: await this.bookingsService.create(user.id, dto) };
  }

  @Get(":id")
  async get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<BookingDto>> {
    return { data: await this.bookingsService.get(user.id, id) };
  }

  @Patch(":id/seats")
  async assignSeats(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: AssignSeatsDto,
  ): Promise<ApiResponse<BookingDto>> {
    return { data: await this.bookingsService.assignSeats(user.id, id, dto) };
  }

  @Post(":id/pay")
  @HttpCode(200)
  async pay(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: PayBookingDto,
  ): Promise<ApiResponse<PayBookingResultDto>> {
    return { data: await this.bookingsService.pay(user.id, id, dto) };
  }

  @Get(":id/refund-quote")
  async refundQuote(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<RefundQuoteDto>> {
    return { data: await this.bookingsService.refundQuote(user.id, id) };
  }

  @Post(":id/cancel")
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<ApiResponse<BookingDto>> {
    return { data: await this.bookingsService.cancel(user.id, id) };
  }
}
