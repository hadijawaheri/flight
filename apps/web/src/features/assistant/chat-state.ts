import type { AskAssistantInput, AssistantAnswerDto } from "@flysmart/contracts";

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; answer: AssistantAnswerDto }
  | { id: string; role: "error"; content: string };

/** The API keeps the last 12 turns; error bubbles are UI-only and never sent back as history. */
export const HISTORY_LIMIT = 12;

export function historyOf(messages: readonly ChatMessage[]): AskAssistantInput["history"] {
  return messages
    .filter(
      (message): message is Exclude<ChatMessage, { role: "error" }> => message.role !== "error",
    )
    .slice(-HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));
}
