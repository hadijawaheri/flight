import type { FlightSummaryDto, SliceDirection } from "@flysmart/contracts";
import { ArrowLeftIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  dateOfLocalTime,
  formatClock,
  formatDuration,
  formatLongDate,
  formatNumber,
} from "@/lib/format";

const DIRECTION_LABELS: Record<SliceDirection, string> = {
  OUTBOUND: "پرواز رفت",
  RETURN: "پرواز برگشت",
};

interface FlightSummaryLineProps {
  flight: FlightSummaryDto;
  direction?: SliceDirection;
}

/** One flight in a compact, scannable line; the same shape in checkout, payment and the e-ticket. */
export function FlightSummaryLine({ flight, direction }: FlightSummaryLineProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {direction && <Badge variant="secondary">{DIRECTION_LABELS[direction]}</Badge>}
        <span className="font-semibold">{flight.airline.nameFa}</span>
        <span className="text-muted-foreground tnum" dir="ltr">
          {flight.flightNumber}
        </span>
        <span className="text-muted-foreground">
          · {formatLongDate(dateOfLocalTime(flight.origin.localTime))}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="tnum text-xl font-extrabold">
            {formatClock(flight.origin.localTime)}
          </span>
          <span className="text-muted-foreground text-xs">{flight.origin.cityFa}</span>
        </div>
        <div className="text-muted-foreground flex min-w-12 flex-1 flex-col items-center gap-0.5 text-xs">
          <span>{formatDuration(flight.durationMinutes)}</span>
          <div className="flex w-full items-center gap-1">
            <span className="bg-border h-px flex-1" />
            <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="tnum text-xl font-extrabold">
            {formatClock(flight.destination.localTime)}
          </span>
          <span className="text-muted-foreground text-xs">{flight.destination.cityFa}</span>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        بار مجاز {formatNumber(flight.baggageKg)} کیلو · {flight.aircraft.nameFa}
      </p>
    </div>
  );
}
