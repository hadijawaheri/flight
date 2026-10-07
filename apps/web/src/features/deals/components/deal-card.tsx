import type { DealDto } from "@flysmart/contracts";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { formatLongDate, formatPercent, formatTomanNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

/**
 * A tile, not a card: deals appear inside the landing's panels and on their own page, and a bordered
 * card inside a panel would nest surfaces.
 */
export function DealCard({ deal }: { deal: DealDto }) {
  return (
    <Link
      href={`${paths.flight(deal.flightId)}?adults=1`}
      className="bg-secondary hover:bg-accent focus-visible:ring-ring/50 group flex h-full flex-col gap-3 rounded-2xl p-4 transition-all duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-base font-bold">
          {deal.originCityFa}
          <ArrowLeftIcon
            className="text-muted-foreground size-3.5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
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
  );
}
