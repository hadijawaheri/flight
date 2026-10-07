"use client";

import type { Cabin } from "@flysmart/contracts";
import { addDaysIso } from "@flysmart/contracts";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJalaliDay, formatJalaliMonth, formatTomanNumber, formatWeekday } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useFareCalendar } from "../queries";

interface FareCalendarStripProps {
  origin: string;
  destination: string;
  cabin: Cabin;
  today: string;
  selectedDate: string;
  /** Where a tile leads: the same search on that day. */
  hrefFor: (date: string) => string;
  /** Earliest day that may be picked (the return leg cannot precede the outbound). */
  minDate: string;
}

const WINDOW_DAYS = 14;

/** Prices around the chosen day, so "what if I leave a day earlier?" costs one tap, not a new search. */
export function FareCalendarStrip({
  origin,
  destination,
  cabin,
  today,
  selectedDate,
  hrefFor,
  minDate,
}: FareCalendarStripProps) {
  const [shift, setShift] = useState(0);
  const earliest = minDate > today ? minDate : today;
  const centered = addDaysIso(selectedDate, -3 + shift);
  const from = centered < earliest ? earliest : centered;

  const { data, isPending, isError } = useFareCalendar({
    origin,
    destination,
    cabin,
    from,
    days: WINDOW_DAYS,
  });

  if (isError) return null;

  return (
    <section aria-label="قیمت روزهای اطراف" className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto self-stretch rounded-xl"
        disabled={from <= earliest}
        onClick={() => setShift((value) => value - 7)}
        aria-label="هفته‌ی قبل"
      >
        <ChevronLeftIcon className="rtl:rotate-180" />
      </Button>

      <ul className="-my-1.5 flex flex-1 snap-x gap-2 overflow-x-auto px-1 py-1.5" role="list">
        {isPending || !data
          ? Array.from({ length: 7 }, (_, index) => (
              <li key={index} className="shrink-0">
                <Skeleton className="h-[4.5rem] w-28 rounded-xl" />
              </li>
            ))
          : data.days.map((day) => {
              const selected = day.date === selectedDate;
              const cheapest = day.date === data.cheapestDate && day.lowestPricePerAdult !== null;
              const empty = day.lowestPricePerAdult === null;
              return (
                <li key={day.date} className="shrink-0 snap-start">
                  <Link
                    href={hrefFor(day.date)}
                    scroll={false}
                    aria-current={selected ? "date" : undefined}
                    aria-disabled={empty}
                    tabIndex={empty ? -1 : undefined}
                    className={cn(
                      "focus-visible:ring-ring/50 shadow-panel flex h-[4.5rem] w-28 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 text-xs transition-colors outline-none focus-visible:ring-3",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted",
                      empty && "pointer-events-none opacity-50",
                    )}
                  >
                    <span
                      className={selected ? "text-primary-foreground/85" : "text-muted-foreground"}
                    >
                      {formatWeekday(day.date)} {formatJalaliDay(day.date)}{" "}
                      {formatJalaliMonth(day.date)}
                    </span>
                    <span
                      className={cn(
                        "tnum text-sm font-bold",
                        cheapest && !selected && "text-brand-ink",
                      )}
                    >
                      {empty ? "—" : formatTomanNumber(day.lowestPricePerAdult ?? 0)}
                    </span>
                    <span className="h-3 text-[0.7rem] leading-3">
                      {cheapest ? (
                        <span
                          className={cn(
                            "font-semibold",
                            selected ? "text-primary-foreground" : "text-brand-ink",
                          )}
                        >
                          ارزان‌ترین
                        </span>
                      ) : null}
                      {!cheapest && day.isPeak ? (
                        <span
                          className={selected ? "text-primary-foreground/85" : "text-warning-ink"}
                        >
                          پرتقاضا
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto self-stretch rounded-xl"
        onClick={() => setShift((value) => value + 7)}
        aria-label="هفته‌ی بعد"
      >
        <ChevronRightIcon className="rtl:rotate-180" />
      </Button>
    </section>
  );
}
