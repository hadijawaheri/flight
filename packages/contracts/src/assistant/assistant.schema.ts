import { z } from "zod";

import type { CheapDealDto } from "../deals/deals.schema";

export const askAssistantSchema = z.object({
  question: z.string().trim().min(1, "متن سوال الزامی است").max(500, "متن سوال طولانی است"),
  origin: z.string().optional(),
  destination: z.string().optional(),
  flightId: z.string().optional(),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;

export interface AssistantAnswerDto {
  answer: string;
  suggestedPrompts?: string[];
  suggestedAction?: {
    type: "SEARCH_FLIGHTS" | "VIEW_DEALS" | "PRICE_ALERT";
    label: string;
    params?: Record<string, unknown>;
  };
  deals?: CheapDealDto[];
}
