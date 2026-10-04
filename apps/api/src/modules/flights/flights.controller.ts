import type { ApiResponse, FareMatrixItemDto, FlightDto } from "@flysmart/contracts";
import { Controller, Get, Param, Query } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import { FareMatrixQueryDto } from "./dto/fare-matrix.dto.js";
import { FlightSearchQueryDto } from "./dto/search-flights.dto.js";
import { FlightsService } from "./flights.service.js";

@Controller({ path: "flights", version: "1" })
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Public()
  @Get("search")
  async search(@Query() query: FlightSearchQueryDto): Promise<ApiResponse<FlightDto[]>> {
    const data = await this.flightsService.search(query);
    return { data };
  }

  @Public()
  @Get("fare-matrix")
  async fareMatrix(@Query() query: FareMatrixQueryDto): Promise<ApiResponse<FareMatrixItemDto[]>> {
    const data = await this.flightsService.getFareMatrix(
      query.origin,
      query.destination,
      query.startDate,
      query.days,
    );
    return { data };
  }

  @Public()
  @Get(":id")
  async getById(@Param("id") id: string): Promise<ApiResponse<FlightDto>> {
    const data = await this.flightsService.getById(id);
    return { data };
  }
}
