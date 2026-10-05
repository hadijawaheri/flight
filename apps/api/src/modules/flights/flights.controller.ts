import { Controller, Get, Param, Query } from "@nestjs/common";
import type {
  ApiResponse,
  FareCalendarDto,
  FlightOfferDto,
  FlightSearchResultDto,
  PriceAnalysisDto,
  SeatMapDto,
} from "@flysmart/contracts";

import { Public } from "../../common/decorators/public.decorator.js";
import {
  FareCalendarQueryDto,
  FlightQuoteQueryDto,
  SearchFlightsQueryDto,
} from "./dto/flights.dto.js";
import { FlightsService } from "./flights.service.js";

@Public()
@Controller({ path: "flights", version: "1" })
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get("search")
  async search(@Query() query: SearchFlightsQueryDto): Promise<ApiResponse<FlightSearchResultDto>> {
    return { data: await this.flightsService.search(query) };
  }

  // Declared before ":id" so "calendar" is not read as a flight id
  @Get("calendar")
  async calendar(@Query() query: FareCalendarQueryDto): Promise<ApiResponse<FareCalendarDto>> {
    return { data: await this.flightsService.fareCalendar(query) };
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Query() query: FlightQuoteQueryDto,
  ): Promise<ApiResponse<FlightOfferDto>> {
    return { data: await this.flightsService.getOffer(id, query) };
  }

  @Get(":id/seats")
  async seats(@Param("id") id: string): Promise<ApiResponse<SeatMapDto>> {
    return { data: await this.flightsService.seatMap(id) };
  }

  @Get(":id/price-analysis")
  async priceAnalysis(@Param("id") id: string): Promise<ApiResponse<PriceAnalysisDto>> {
    return { data: await this.flightsService.priceAnalysis(id) };
  }
}
