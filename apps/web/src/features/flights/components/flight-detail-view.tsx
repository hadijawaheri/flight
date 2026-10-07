"use client";

import { parseFlightId } from "@flysmart/contracts";
import { ChevronLeftIcon, LuggageIcon, UtensilsIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TripQuery } from "@/features/search";
import { mixOf, tripSearchParams } from "@/features/search";
import {
  dateOfLocalTime,
  formatClock,
  formatDuration,
  formatLongDate,
  formatNumber,
} from "@/lib/format";
import { paths } from "@/lib/paths";

import { FARE_FAMILY_LABELS, FLIGHT_TYPE_LABELS, TAG_LABELS } from "../labels";
import { useFlightOffer } from "../queries";
import { stepAfterSelecting } from "../selection";
import { FareBreakdownTable } from "./fare-breakdown";
import { InsightBadge } from "./insight-badge";
import { PriceAnalysisPanel } from "./price-analysis-panel";
import { RefundPolicyList } from "./refund-policy";
import { RouteLine } from "./route-line";

interface FlightDetailViewProps {
  flightId: string;
  /** The search the traveller came from; null when the link was opened directly. */
  trip: TripQuery | null;
  /** Party size, used when `trip` is null. */
  party: { adults: number; children: number; infants: number };
  outboundId: string | null;
}

export function FlightDetailView({ flightId, trip, party, outboundId }: FlightDetailViewProps) {
  const router = useRouter();
  const mix = trip ? mixOf(trip) : party;
  const { data: offer, isPending, isError, error, refetch } = useFlightOffer(flightId, mix);
  const key = parseFlightId(flightId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="در حال بارگذاری پرواز">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError || !key) {
    return <ErrorState error={error} onRetry={() => void refetch()} title="این پرواز پیدا نشد" />;
  }

  // Opened without a search: behave like a one-way trip on this flight's own route and day.
  const effective: TripQuery = trip ?? {
    origin: offer.origin.airportCode,
    destination: offer.destination.airportCode,
    date: dateOfLocalTime(offer.origin.localTime),
    ...mix,
    cabin: offer.cabin,
  };
  const step = stepAfterSelecting(effective, outboundId, offer.id);
  const resultsHref = `${paths.flights}?${tripSearchParams(effective).toString()}`;
  const dateHref = (date: string): string => {
    const params = tripSearchParams({
      ...effective,
      date,
      ...(effective.returnDate && effective.returnDate < date ? { returnDate: date } : {}),
    });
    return `${paths.flights}?${params.toString()}`;
  };

  const label = step.next === "return" ? "انتخاب و رفتن به پرواز برگشت" : "انتخاب و ادامه";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link href={resultsHref}>
            <ChevronLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
            بازگشت به نتایج
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CardTitle className="text-xl">{offer.airline.nameFa}</CardTitle>
              <span className="text-muted-foreground tnum" dir="ltr">
                {offer.flightNumber}
              </span>
              {offer.flightType === "CHARTER" && (
                <Badge variant="outline">{FLIGHT_TYPE_LABELS.CHARTER}</Badge>
              )}
              {offer.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {TAG_LABELS[tag]}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              {formatLongDate(dateOfLocalTime(offer.origin.localTime))}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Point
                time={offer.origin.localTime}
                code={offer.origin.airportCode}
                city={offer.origin.cityFa}
                airport={offer.origin.airportNameFa}
              />
              <div className="text-muted-foreground flex min-w-20 flex-1 flex-col items-center gap-2 text-xs">
                <span className="tnum">{formatDuration(offer.durationMinutes)}</span>
                <RouteLine />
                <span>بدون توقف</span>
              </div>
              <Point
                time={offer.destination.localTime}
                code={offer.destination.airportCode}
                city={offer.destination.cityFa}
                airport={offer.destination.airportNameFa}
                end
              />
            </div>

            <dl className="bg-muted/60 grid grid-cols-2 gap-4 rounded-xl p-4 text-sm sm:grid-cols-3">
              <Fact label="هواپیما" value={offer.aircraft.nameFa} />
              <Fact label="نوع نرخ" value={FARE_FAMILY_LABELS[offer.fareFamily]} />
              <Fact
                label="بار مجاز"
                value={
                  <span className="flex items-center gap-1">
                    <LuggageIcon className="size-3.5" aria-hidden="true" />
                    {formatNumber(offer.baggageKg)} کیلو
                  </span>
                }
              />
              <Fact label="بار دستی" value={`${formatNumber(offer.cabinBaggageKg)} کیلو`} />
              <Fact
                label="پذیرایی"
                value={
                  offer.meal ? (
                    <span className="flex items-center gap-1">
                      <UtensilsIcon className="size-3.5" aria-hidden="true" />
                      دارد
                    </span>
                  ) : (
                    "ندارد"
                  )
                }
              />
              <Fact label="صندلی باقی‌مانده" value={formatNumber(offer.seatsLeft)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">قوانین استرداد و تغییر</CardTitle>
          </CardHeader>
          <CardContent>
            <RefundPolicyList policy={offer.refundPolicy} />
            <p className="text-muted-foreground mt-3 text-xs">
              جریمه روی کرایه‌ی پایه حساب می‌شود و کارمزد خدمات در لغو ارادی برگردانده نمی‌شود. برای
              هر سؤال درباره‌ی بار و مدارک از{" "}
              <Link href={paths.assistant} className="text-primary underline underline-offset-4">
                دستیار پرواز
              </Link>{" "}
              بپرسید.
            </p>
          </CardContent>
        </Card>

        <PriceAnalysisPanel
          flightId={offer.id}
          origin={offer.origin.airportCode}
          destination={offer.destination.airportCode}
          date={dateOfLocalTime(offer.origin.localTime)}
          cabin={offer.cabin}
          dateHref={dateHref}
        />
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="خلاصه‌ی قیمت">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">خلاصه‌ی قیمت</CardTitle>
            <InsightBadge insight={offer.insight} detailed />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FareBreakdownTable fare={offer.fare} />
            <Button type="button" size="lg" onClick={() => router.push(step.href)}>
              {label}
            </Button>
            <div className="text-muted-foreground flex items-baseline justify-between text-xs">
              <span>قیمت برای هر بزرگسال</span>
              <Toman rial={offer.pricePerAdult} className="text-xs" />
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Point({
  time,
  code,
  city,
  airport,
  end,
}: {
  time: string;
  code: string;
  city: string;
  airport: string;
  end?: boolean;
}) {
  return (
    <div className={end ? "flex flex-col items-end" : "flex flex-col"}>
      <span className="tnum text-4xl leading-none font-black">{formatClock(time)}</span>
      <span className="mt-2 font-semibold">{city}</span>
      <span className="text-muted-foreground text-xs">
        {airport} ·{" "}
        <bdi className="tnum tracking-widest" dir="ltr">
          {code}
        </bdi>
      </span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
