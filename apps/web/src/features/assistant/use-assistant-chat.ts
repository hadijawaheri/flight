"use client";

import type { AskAssistantInput } from "@flysmart/contracts";
import { useRef, useState } from "react";

import { ApiError, getErrorMessage } from "@/lib/api/parse";

import { type ChatMessage, historyOf } from "./chat-state";
import { useAskAssistant } from "./queries";

type Context = AskAssistantInput["context"];

let counter = 0;
const nextId = (): string => `m${(counter += 1)}`;

/** One conversation: the widget and the full page each own their own, so they never leak into each other. */
export function useAssistantChat(context: Context) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const ask = useAskAssistant();
  // Always the latest list: a quick second question must carry the first answer as history.
  const latest = useRef<ChatMessage[]>([]);

  function commit(next: ChatMessage[]) {
    latest.current = next;
    setMessages(next);
  }

  async function send(text: string): Promise<void> {
    const message = text.trim();
    if (!message || ask.isPending) return;

    const history = historyOf(latest.current);
    commit([...latest.current, { id: nextId(), role: "user", content: message }]);
    try {
      const answer = await ask.mutateAsync({ message, history, ...(context ? { context } : {}) });
      commit([
        ...latest.current,
        { id: nextId(), role: "assistant", content: answer.answer, answer },
      ]);
    } catch (error: unknown) {
      const throttled = error instanceof ApiError && error.status === 429;
      commit([
        ...latest.current,
        {
          id: nextId(),
          role: "error",
          content: throttled
            ? "تعداد پرسش‌ها زیاد بود. یک دقیقه بعد دوباره امتحان کنید."
            : getErrorMessage(error),
        },
      ]);
    }
  }

  function reset() {
    commit([]);
  }

  return { messages, send, reset, pending: ask.isPending };
}
