import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { ApiResponse, AssistantAnswerDto, AssistantStatusDto } from "@flysmart/contracts";

import { OptionalUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthUser } from "../../common/types/auth.js";
import { AssistantService } from "./assistant.service.js";
import { AskAssistantDto } from "./dto/assistant.dto.js";

@Public()
@Controller({ path: "assistant", version: "1" })
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get("status")
  status(): ApiResponse<AssistantStatusDto> {
    return { data: this.assistant.status() };
  }

  /** Public because rules questions need no account; a session, when present, unlocks booking-specific answers. */
  @Post("ask")
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  async ask(
    @Body() dto: AskAssistantDto,
    @OptionalUser() user: AuthUser | undefined,
  ): Promise<ApiResponse<AssistantAnswerDto>> {
    return { data: await this.assistant.ask(dto, user?.id) };
  }
}
