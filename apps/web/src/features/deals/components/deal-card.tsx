import type { DealDto } from "@flysmart/contracts";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatLongDate, formatPercent, formatTomanNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

export function DealCard({ deal }: { deal: DealDto }) {
  return (
    <Card className="p-0">
      <Link
        href={`${paths.flight(deal.flightId)}?adults=1`}
        className="hover:bg-muted/50 focus-visible:ring-ring/50 flex h-full flex-col gap-3 rounded-xl p-4 outline-none focus-visible:ring-3"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-base font-bold">
            {deal.originCityFa}
            <ArrowLeftIcon className="text-muted-foreground size-3.5" aria-hidden="true" />
            {deal.destinationCityFa}
          </span>
          <Badge variant="secondary" className="bg-warning-soft text-warning-ink">
            {formatPercent(deal.discountPercent)} زیر معمول
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {formatLongDate(deal.date)} · {deal.airline.nameFa}
        </p>
        <div className="mt-auto flex items-baseline justify-between gap-2">
          <Toman rial={deal.pricePerAdult} className="text-lg" />
          <span className="text-muted-foreground tnum text-xs line-through decoration-1">
            {formatTomanNumber(deal.typicalPrice)}
          </span>
        </div>
      </Link>
    </Card>
  );
}
