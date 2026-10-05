import type { PriceInsightSummary } from "@flysmart/contracts";
import { ClockIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ADVICE_LABELS, VERDICT_LABELS } from "../labels";

interface InsightBadgeProps {
  insight: PriceInsightSummary;
  className?: string;
  /** Adds the "cheaper than X% of days" line beneath the advice. */
  detailed?: boolean;
}

/** The product's signature: one glance tells whether to book now or hold off. */
export function InsightBadge({ insight, className, detailed }: InsightBadgeProps) {
  const buy = insight.advice === "BUY_NOW";
  const Icon = buy ? TrendingUpIcon : ClockIcon;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge
        variant="secondary"
        className={cn(
          "h-6 gap-1.5 px-2.5",
          buy ? "bg-brand-soft text-brand-ink" : "bg-warning-soft text-warning-ink",
        )}
      >
        <Icon aria-hidden="true" />
        {ADVICE_LABELS[insight.advice]}
      </Badge>
      <span className="text-muted-foreground text-xs">
        قیمت {VERDICT_LABELS[insight.verdict]}
        {detailed && ` · ارزان‌تر از ${formatPercent(insight.cheaperThanPercent)} روزها`}
      </span>
    </div>
  );
}
