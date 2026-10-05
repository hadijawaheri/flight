import { describe, expect, it } from "vitest";

import { type ChatMessage, HISTORY_LIMIT, historyOf } from "./chat-state";

describe("historyOf", () => {
  it("drops error bubbles and keeps role and text", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "سلام" },
      { id: "2", role: "error", content: "خطا" },
      {
        id: "3",
        role: "assistant",
        content: "سلام!",
        answer: {
          answer: "سلام!",
          mode: "offline",
          citations: [],
          cards: [],
          suggestions: [],
          verifyNotice: null,
        },
      },
    ];
    expect(historyOf(messages)).toEqual([
      { role: "user", content: "سلام" },
      { role: "assistant", content: "سلام!" },
    ]);
  });

  it("keeps only the most recent turns", () => {
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      role: "user" as const,
      content: `q${index}`,
    }));
    const history = historyOf(messages);
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history.at(-1)?.content).toBe("q19");
  });
});
