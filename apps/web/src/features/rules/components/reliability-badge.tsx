import { type Reliability, RELIABILITY_LABELS } from "@flysmart/contracts";
import { CircleCheckIcon, ClockAlertIcon, PlaneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<Reliability, string> = {
  STANDARD: "bg-brand-soft text-brand-ink",
  AIRLINE_SPECIFIC: "bg-muted text-foreground",
  VOLATILE: "bg-warning-soft text-warning-ink",
};

const ICONS: Record<Reliability, typeof PlaneIcon> = {
  STANDARD: CircleCheckIcon,
  AIRLINE_SPECIFIC: PlaneIcon,
  VOLATILE: ClockAlertIcon,
};

/** Says how far to trust a rule before reading it; the colour is never the only signal (icon + words). */
export function ReliabilityBadge({
  reliability,
  className,
}: {
  reliability: Reliability;
  className?: string;
}) {
  const Icon = ICONS[reliability];
  return (
    <Badge variant="secondary" className={cn(STYLES[reliability], className)}>
      <Icon aria-hidden="true" />
      {RELIABILITY_LABELS[reliability]}
    </Badge>
  );
}
