import type { ApiResponse, AssistantAnswerDto } from "@flysmart/contracts";
import { Body, Controller, Post } from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator.js";
import { AssistantService } from "./assistant.service.js";
import { AskAssistantDto } from "./dto/ask-assistant.dto.js";

@Controller({ path: "assistant", version: "1" })
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Public()
  @Post("ask")
  async ask(@Body() dto: AskAssistantDto): Promise<ApiResponse<AssistantAnswerDto>> {
    const data = await this.assistantService.answerQuestion(dto);
    return { data };
  }
}
