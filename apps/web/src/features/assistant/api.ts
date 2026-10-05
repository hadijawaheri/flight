import type {
  ApiResponse,
  AskAssistantInput,
  AssistantAnswerDto,
  AssistantStatusDto,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const assistantApi = {
  status: async () => (await api<ApiResponse<AssistantStatusDto>>("/assistant/status")).data,
  ask: async (input: AskAssistantInput) =>
    (await api<ApiResponse<AssistantAnswerDto>>("/assistant/ask", { method: "POST", json: input }))
      .data,
};
