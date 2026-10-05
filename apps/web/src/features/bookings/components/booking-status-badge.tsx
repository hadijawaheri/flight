import type { BookingStatus } from "@flysmart/contracts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی شده",
};

const STYLES: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "bg-warning-soft text-warning-ink",
  CONFIRMED: "bg-brand-soft text-brand-ink",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(STYLES[status], className)}>
      {LABELS[status]}
    </Badge>
  );
}
