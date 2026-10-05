import type { FlightOfferDto } from "@flysmart/contracts";
import { ArrowLeftIcon, LuggageIcon, UtensilsIcon } from "lucide-react";
import Link from "next/link";

import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatClock, formatDuration, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import { FLIGHT_TYPE_LABELS, TAG_LABELS } from "../labels";
import { InsightBadge } from "./insight-badge";
import { RefundPolicyList } from "./refund-policy";

interface FlightCardProps {
  offer: FlightOfferDto;
  onSelect: (offer: FlightOfferDto) => void;
  selectLabel: string;
  /** Detail pages need the party size to quote the same total. */
  detailQuery: string;
}

export function FlightCard({ offer, onSelect, selectLabel, detailQuery }: FlightCardProps) {
  const scarce = offer.seatsLeft <= 5;

  return (
    <Card className="gap-0 py-0">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{offer.airline.nameFa}</span>
            <span className="text-muted-foreground tnum" dir="ltr">
              {offer.flightNumber}
            </span>
            <span className="text-muted-foreground">· {offer.aircraft.nameFa}</span>
            {offer.flightType === "CHARTER" && (
              <Badge variant="outline">{FLIGHT_TYPE_LABELS.CHARTER}</Badge>
            )}
            {offer.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {TAG_LABELS[tag]}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="tnum text-2xl font-extrabold">
                {formatClock(offer.origin.localTime)}
              </span>
              <span className="text-muted-foreground text-xs">{offer.origin.cityFa}</span>
            </div>
            <div className="text-muted-foreground flex min-w-16 flex-1 flex-col items-center gap-1 text-xs">
              <span>{formatDuration(offer.durationMinutes)}</span>
              <div className="flex w-full items-center gap-1">
                <span className="bg-border h-px flex-1" />
                <ArrowLeftIcon className="size-3.5 rtl:rotate-0" aria-hidden="true" />
              </div>
              <span>بدون توقف</span>
            </div>
            <div className="flex flex-col">
              <span className="tnum text-2xl font-extrabold">
                {formatClock(offer.destination.localTime)}
              </span>
              <span className="text-muted-foreground text-xs">{offer.destination.cityFa}</span>
            </div>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <LuggageIcon className="size-3.5" aria-hidden="true" />
              بار {formatNumber(offer.baggageKg)} کیلو
            </span>
            {offer.meal && (
              <span className="flex items-center gap-1">
                <UtensilsIcon className="size-3.5" aria-hidden="true" />
                پذیرایی
              </span>
            )}
            {scarce && (
              <span className="text-warning-ink font-medium">
                فقط {formatNumber(offer.seatsLeft)} صندلی مانده
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 border-t pt-3 md:flex-col md:items-end md:border-s md:border-t-0 md:ps-5 md:pt-0">
          <div className="flex flex-col gap-1 md:items-end">
            <Toman rial={offer.pricePerAdult} className="text-xl" />
            <span className="text-muted-foreground text-xs">برای هر بزرگسال، با مالیات</span>
            <InsightBadge insight={offer.insight} />
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => onSelect(offer)}>
              {selectLabel}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${paths.flight(offer.id)}${detailQuery}`}>جزئیات و تحلیل قیمت</Link>
            </Button>
          </div>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 w-full border-t px-4 py-2 text-start text-xs outline-none focus-visible:ring-3">
          قوانین استرداد و تغییر این پرواز
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <RefundPolicyList policy={offer.refundPolicy} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
