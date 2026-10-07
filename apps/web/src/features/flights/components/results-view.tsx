"use client";

import type { FlightOfferDto, FlightSort } from "@flysmart/contracts";
import { locationLabel } from "@flysmart/contracts";
import { ArrowLeftIcon, CheckCircle2Icon, SearchXIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { TripLeg, TripQuery } from "@/features/search";
import { legOf, mixOf, SearchForm, tripSearchParams } from "@/features/search";
import { formatClock, formatLongDate, formatNumber } from "@/lib/format";

import { activeFilterCount, applyFilters } from "../filter-offers";
import { useOfferFilters } from "../filters";
import { SORT_LABELS } from "../labels";
import { useFlightOffer, useFlightSearch } from "../queries";
import { detailSearch, stepAfterSelecting } from "../selection";
import { FareCalendarStrip } from "./fare-calendar-strip";
import { FiltersPanel } from "./filters-panel";
import { FlightCard } from "./flight-card";
import { RouteLine } from "./route-line";

interface ResultsViewProps {
  query: TripQuery;
  today: string;
  /** Round trips: the outbound flight already chosen, which switches the view to the return leg. */
  outboundId: string | null;
}

function partySummary(query: TripQuery): string {
  const parts = [`${formatNumber(query.adults)} بزرگسال`];
  if (query.children > 0) parts.push(`${formatNumber(query.children)} کودک`);
  if (query.infants > 0) parts.push(`${formatNumber(query.infants)} نوزاد`);
  return parts.join("، ");
}

export function ResultsView({ query, today, outboundId }: ResultsViewProps) {
  const router = useRouter();
  const roundTrip = Boolean(query.returnDate);
  const leg: TripLeg = roundTrip && outboundId ? "RETURN" : "OUTBOUND";
  const route = legOf(query, leg);
  const mix = mixOf(query);

  const [filters, updateFilters, resetFilters] = useOfferFilters();
  const [editing, setEditing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The full, unfiltered set: filtering and sorting run locally so facets and counts stay stable.
  const search = useFlightSearch({ ...route, ...mix, cabin: query.cabin, sort: "best" });
  const outbound = useFlightOffer(outboundId ?? "", mix, leg === "RETURN");

  const offers = search.data?.offers ?? [];
  const shown = applyFilters(offers, filters);
  const activeCount = activeFilterCount(filters);

  function select(offer: FlightOfferDto) {
    router.push(stepAfterSelecting(query, outboundId, offer.id).href);
  }

  function dateHref(date: string): string {
    const next: TripQuery =
      leg === "RETURN"
        ? { ...query, returnDate: date }
        : {
            ...query,
            date,
            ...(query.returnDate && query.returnDate < date ? { returnDate: date } : {}),
          };
    const params = tripSearchParams(next);
    // Changing the outbound day invalidates a chosen outbound flight; the return day does not.
    if (leg === "RETURN" && outboundId) params.set("out", outboundId);
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        {roundTrip && (
          <div className="flex items-center gap-2 text-xs" aria-label="مرحله‌ی انتخاب">
            <Badge variant={leg === "OUTBOUND" ? "default" : "outline"} className="bg-card/80">
              ۱. پرواز رفت
            </Badge>
            <Badge variant={leg === "RETURN" ? "default" : "outline"} className="bg-card/80">
              ۲. پرواز برگشت
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 text-3xl font-black md:text-5xl">
              <span>{locationLabel(route.origin)}</span>
              <RouteLine className="w-20 md:w-36" />
              <span className="sr-only">به</span>
              <span>{locationLabel(route.destination)}</span>
            </h1>
            <p className="text-foreground/75 text-sm">
              {formatLongDate(route.date)} · {partySummary(query)} ·{" "}
              {query.cabin === "BUSINESS" ? "بیزینس" : "اکونومی"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing((value) => !value)}
            aria-expanded={editing}
          >
            {editing ? "بستن" : "تغییر جست‌وجو"}
          </Button>
        </div>
        {editing && (
          <Card className="p-5">
            <SearchForm today={today} initial={query} />
          </Card>
        )}
      </header>

      {leg === "RETURN" && (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>پرواز رفت انتخاب شد</AlertTitle>
          <AlertDescription>
            {outbound.data ? (
              <p className="flex flex-wrap items-center gap-x-2">
                <span>
                  {outbound.data.airline.nameFa} {outbound.data.flightNumber} ·{" "}
                  {formatClock(outbound.data.origin.localTime)}{" "}
                  <ArrowLeftIcon className="inline size-3 rtl:rotate-0" />{" "}
                  {formatClock(outbound.data.destination.localTime)}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => router.push(`?${tripSearchParams(query).toString()}`)}
                >
                  تغییر پرواز رفت
                </Button>
              </p>
            ) : outbound.isError ? (
              <p>اطلاعات پرواز رفت در دسترس نیست؛ برای انتخاب دوباره، پرواز رفت را تغییر دهید.</p>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
          </AlertDescription>
        </Alert>
      )}

      <FareCalendarStrip
        origin={route.origin}
        destination={route.destination}
        cabin={query.cabin}
        today={today}
        selectedDate={route.date}
        minDate={leg === "RETURN" ? query.date : today}
        hrefFor={dateHref}
      />

      {search.data?.summary.isPeakDate && (
        <Alert>
          <AlertTitle className="text-warning-ink">روز پرتقاضا</AlertTitle>
          <AlertDescription>
            {search.data.summary.demandReasons.join("؛ ") ||
              "قیمت‌ها در این تاریخ معمولاً بالاتر است."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start" aria-label="فیلترها">
          {search.data && (
            <Card>
              <CardContent>
                <FiltersPanel
                  offers={offers}
                  summary={search.data.summary}
                  filters={filters}
                  onChange={updateFilters}
                  onReset={resetFilters}
                />
              </CardContent>
            </Card>
          )}
        </aside>

        <section
          className="flex min-w-0 flex-col gap-3"
          aria-label="نتایج پرواز"
          aria-busy={search.isFetching}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {search.data
                ? `${formatNumber(shown.length)} پرواز از ${formatNumber(offers.length)} پرواز`
                : "در حال جست‌وجو…"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontalIcon data-icon="inline-start" />
                فیلترها{activeCount > 0 && ` (${formatNumber(activeCount)})`}
              </Button>
              <Select
                value={filters.sort}
                onValueChange={(value) => updateFilters({ sort: value as FlightSort })}
              >
                <SelectTrigger className="w-44" aria-label="مرتب‌سازی">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {search.isPending ? (
            <div className="flex flex-col gap-3" role="status" aria-label="در حال بارگذاری پروازها">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : search.isError ? (
            <ErrorState
              error={search.error}
              onRetry={() => void search.refetch()}
              title="جست‌وجوی پرواز انجام نشد"
            />
          ) : shown.length === 0 ? (
            <Empty className="bg-card shadow-panel border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {offers.length === 0 ? "پروازی پیدا نشد" : "پروازی با این فیلترها نیست"}
                </EmptyTitle>
                <EmptyDescription>
                  {offers.length === 0
                    ? "برای این مسیر و تاریخ پروازی با ظرفیت کافی وجود ندارد. روز دیگری را از نوار قیمت بالا امتحان کنید."
                    : "فیلترها را کم کنید تا پروازهای بیشتری ببینید."}
                </EmptyDescription>
              </EmptyHeader>
              {offers.length > 0 && (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  حذف فیلترها
                </Button>
              )}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-4" role="list">
              {shown.map((offer) => (
                <li key={offer.id}>
                  <FlightCard
                    offer={offer}
                    onSelect={select}
                    selectLabel={
                      roundTrip
                        ? leg === "OUTBOUND"
                          ? "انتخاب پرواز رفت"
                          : "انتخاب و ادامه"
                        : "انتخاب و ادامه"
                    }
                    detailQuery={detailSearch(query, leg === "RETURN" ? outboundId : null)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>فیلتر نتایج</SheetTitle>
            <SheetDescription className="sr-only">
              محدود کردن پروازها بر اساس ایرلاین، ساعت و قیمت
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {search.data && (
              <FiltersPanel
                offers={offers}
                summary={search.data.summary}
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
              />
            )}
            <Button type="button" className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              نمایش {formatNumber(shown.length)} پرواز
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
