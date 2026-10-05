"use client";

import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import { useFlashDeals } from "../queries";
import { DealCard } from "./deal-card";

interface FlashDealsProps {
  origin?: string;
  limit?: number;
}

export function FlashDeals({ origin = "THR", limit = 8 }: FlashDealsProps) {
  const { data, isPending, isError, error, refetch } = useFlashDeals(origin, limit);

  if (isPending) {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        role="status"
        aria-label="در حال بارگذاری پیشنهادها"
      >
        {Array.from({ length: Math.min(limit, 4) }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} title="پیشنهادها دریافت نشد" />;
  if (data.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        فعلاً پیشنهاد ویژه‌ای پیدا نشد؛ کمی بعد دوباره سر بزنید.
      </p>
    );

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
      {data.map((deal) => (
        <li key={deal.flightId}>
          <DealCard deal={deal} />
        </li>
      ))}
    </ul>
  );
}
