import type { ApiResponse, BudgetDestinationDto, CheapDealDto } from "@flysmart/contracts";
import { Controller, Get, Query } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import { DealsService } from "./deals.service.js";
import { BudgetExploreQueryDto } from "./dto/budget-explore.dto.js";

@Controller({ path: "deals", version: "1" })
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Public()
  @Get()
  async getDeals(): Promise<ApiResponse<CheapDealDto[]>> {
    const data = await this.dealsService.getDeals();
    return { data };
  }

  @Public()
  @Get("explore")
  async exploreBudget(
    @Query() query: BudgetExploreQueryDto,
  ): Promise<ApiResponse<BudgetDestinationDto[]>> {
    const data = await this.dealsService.exploreBudget(query.origin, query.maxBudget);
    return { data };
  }
}
