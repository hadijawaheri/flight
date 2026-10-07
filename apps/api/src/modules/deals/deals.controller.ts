import type { ApiResponse, DealDto, ExploreResultDto, TripIdeasDto } from "@flysmart/contracts";
import { Controller, Get, Query } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import { DealsService } from "./deals.service.js";
import { ExploreQueryDto, FlashDealsQueryDto, TripIdeasQueryDto } from "./dto/deals.dto.js";

@Public()
@Controller({ path: "deals", version: "1" })
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get("flash")
  async flash(@Query() query: FlashDealsQueryDto): Promise<ApiResponse<DealDto[]>> {
    return { data: await this.dealsService.flash(query) };
  }

  @Get("explore")
  async explore(@Query() query: ExploreQueryDto): Promise<ApiResponse<ExploreResultDto>> {
    return { data: await this.dealsService.explore(query) };
  }

  @Get("trips")
  async trips(@Query() query: TripIdeasQueryDto): Promise<ApiResponse<TripIdeasDto>> {
    return { data: await this.dealsService.trips(query) };
  }
}
