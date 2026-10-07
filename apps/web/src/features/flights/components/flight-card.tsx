import type { FlightOfferDto } from "@flysmart/contracts";
import { ChevronDownIcon, LuggageIcon, UtensilsIcon } from "lucide-react";
import Link from "next/link";

import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatClock, formatDuration, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import { FLIGHT_TYPE_LABELS, TAG_LABELS } from "../labels";
import { InsightBadge } from "./insight-badge";
import { RefundPolicyList } from "./refund-policy";
import { RouteLine } from "./route-line";

interface FlightCardProps {
  offer: FlightOfferDto;
  onSelect: (offer: FlightOfferDto) => void;
  selectLabel: string;
  /** Detail pages need the party size to quote the same total. */
  detailQuery: string;
}

/** An offer drawn as a boarding pass: the flight on the body, the price and the action on the stub. */
export function FlightCard({ offer, onSelect, selectLabel, detailQuery }: FlightCardProps) {
  const scarce = offer.seatsLeft <= 5;

  return (
    <div className="ticket-wrap">
      <article className="ticket text-card-foreground grid overflow-hidden text-sm md:grid-cols-[minmax(0,1fr)_var(--stub)]">
        <div className="flex min-w-0 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{offer.airline.nameFa}</span>
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

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4">
            <Endpoint
              time={offer.origin.localTime}
              code={offer.origin.airportCode}
              city={offer.origin.cityFa}
            />
            <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-xs">
              <span className="tnum">{formatDuration(offer.durationMinutes)}</span>
              <RouteLine />
              <span>بدون توقف</span>
            </div>
            <Endpoint
              time={offer.destination.localTime}
              code={offer.destination.airportCode}
              city={offer.destination.cityFa}
            />
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <LuggageIcon className="size-3.5" aria-hidden="true" />
              بار {formatNumber(offer.baggageKg)} کیلو
            </span>
            {offer.meal && (
              <span className="flex items-center gap-1.5">
                <UtensilsIcon className="size-3.5" aria-hidden="true" />
                پذیرایی
              </span>
            )}
            {scarce && (
              <span className="text-warning-ink font-semibold">
                فقط {formatNumber(offer.seatsLeft)} صندلی مانده
              </span>
            )}
          </div>

          <Collapsible className="group/rules">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-xs outline-none focus-visible:ring-3">
              قوانین استرداد و تغییر این پرواز
              <ChevronDownIcon
                className="size-3.5 transition-transform group-data-[state=open]/rules:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <RefundPolicyList policy={offer.refundPolicy} />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="ticket-stub border-foreground/25 flex flex-col justify-between gap-4 border-t-2 border-dashed p-5 sm:flex-row sm:items-center md:flex-col md:items-stretch md:justify-center md:border-s-2 md:border-t-0">
          <div className="flex flex-col gap-1">
            <Toman rial={offer.pricePerAdult} className="text-2xl font-black" />
            <span className="text-muted-foreground text-xs">برای هر بزرگسال، با مالیات</span>
            <InsightBadge insight={offer.insight} className="mt-1" />
          </div>
          <div className="flex flex-col gap-1.5 sm:shrink-0">
            <Button type="button" size="lg" onClick={() => onSelect(offer)}>
              {selectLabel}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${paths.flight(offer.id)}${detailQuery}`}>جزئیات و تحلیل قیمت</Link>
            </Button>
          </div>
        </div>
      </article>
    </div>
  );
}

function Endpoint({ time, code, city }: { time: string; code: string; city: string }) {
  return (
    <div className="flex flex-col">
      <span className="tnum text-3xl leading-none font-black">{formatClock(time)}</span>
      <span className="mt-1.5 font-medium">{city}</span>
      <span className="text-muted-foreground tnum text-xs tracking-widest" dir="ltr">
        {code}
      </span>
    </div>
  );
}
