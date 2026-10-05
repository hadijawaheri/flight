import type { PriceInsight } from "./price-insight";

/** The part of an insight small enough to ride on every search result card. */
export type PriceInsightSummary = Pick<
  PriceInsight,
  "verdict" | "advice" | "cheaperThanPercent" | "trend" | "confidence"
>;

export function summarizeInsight(insight: PriceInsight): PriceInsightSummary {
  return {
    verdict: insight.verdict,
    advice: insight.advice,
    cheaperThanPercent: insight.cheaperThanPercent,
    trend: insight.trend,
    confidence: insight.confidence,
  };
}
