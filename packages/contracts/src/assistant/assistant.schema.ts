import { z } from "zod";

import { flightIdSchema } from "../flights/flight-id";
import type { Reliability } from "../rules/rules.schema";

export const ASSISTANT_MODES = ["ai", "offline"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export const ASSISTANT_MAX_MESSAGE_LENGTH = 1000;

export const assistantHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const askAssistantSchema = z.object({
  message: z.string().trim().min(1, "پیام نمی‌تواند خالی باشد").max(ASSISTANT_MAX_MESSAGE_LENGTH),
  history: z.array(assistantHistoryItemSchema).max(12).default([]),
  context: z
    .object({
      flightId: flightIdSchema.optional(),
      bookingId: z.string().max(40).optional(),
    })
    .optional(),
});
export type AskAssistantInput = z.infer<typeof askAssistantSchema>;

export const ASSISTANT_TOOLS = [
  "evaluate_battery",
  "excess_baggage",
  "refund_estimate",
  "price_advice",
  "cheapest_flights",
] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];

/** A computed answer rendered as a card under the assistant message. */
export interface AssistantCardDto {
  tool: AssistantTool;
  title: string;
  tone: "ok" | "warn" | "danger" | "info";
  rows: Array<{ label: string; value: string }>;
  note: string | null;
  /** In-app link, e.g. to the flight the advice is about. */
  href: string | null;
}

export interface AssistantCitationDto {
  id: string;
  title: string;
  reliability: Reliability;
}

export interface AssistantAnswerDto {
  answer: string;
  mode: AssistantMode;
  citations: AssistantCitationDto[];
  cards: AssistantCardDto[];
  /** Follow-up questions worth asking next. */
  suggestions: string[];
  /** Shown when any citation is not STANDARD: the airline decides. */
  verifyNotice: string | null;
}

export interface AssistantStatusDto {
  mode: AssistantMode;
  /** Questions starter chips. */
  starters: string[];
}
