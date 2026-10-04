import type { ApiResponse, AskAssistantInput, AssistantAnswerDto } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function askAssistantApi(input: AskAssistantInput): Promise<AssistantAnswerDto> {
  const res = await api<ApiResponse<AssistantAnswerDto>>("/assistant/ask", {
    method: "POST",
    json: input,
  });
  return res.data;
}
