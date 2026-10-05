import { Controller, Get, Param, Query } from "@nestjs/common";
import type {
  AirportGuideDto,
  ApiResponse,
  RuleEntryDto,
  RulesIndexDto,
} from "@flysmart/contracts";

import { Public } from "../../common/decorators/public.decorator.js";
import { ListRulesQueryDto } from "./dto/rules.dto.js";
import { KnowledgeService } from "./knowledge.service.js";

@Public()
@Controller({ version: "1" })
export class RulesController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get("rules")
  list(@Query() query: ListRulesQueryDto): ApiResponse<RulesIndexDto> {
    return { data: this.knowledge.list(query) };
  }

  @Get("rules/:id")
  get(@Param("id") id: string): ApiResponse<RuleEntryDto> {
    return { data: this.knowledge.get(id) };
  }

  @Get("airports/:code/guide")
  airportGuide(@Param("code") code: string): ApiResponse<AirportGuideDto> {
    return { data: this.knowledge.airportGuide(code) };
  }
}
