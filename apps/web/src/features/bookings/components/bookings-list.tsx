"use client";

import { ChevronLeftIcon, ChevronRightIcon, TicketIcon } from "lucide-react";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import { useBookings } from "../queries";
import { BookingStatusBadge } from "./booking-status-badge";

const PAGE_SIZE = 8;
const WHEN = ["upcoming", "past"] as const;

export function BookingsList() {
  const [{ when, page }, setQuery] = useQueryStates(
    {
      when: parseAsStringLiteral(WHEN).withDefault("upcoming"),
      page: parseAsInteger.withDefault(1),
    },
    { clearOnDefault: true },
  );
  const { data, isPending, isError, error, refetch, isFetching } = useBookings({
    page,
    limit: PAGE_SIZE,
    when,
  });

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={when}
        onValueChange={(value) => void setQuery({ when: value as (typeof WHEN)[number], page: 1 })}
      >
        <TabsList aria-label="نوع سفرها">
          <TabsTrigger value="upcoming">سفرهای پیش‌رو</TabsTrigger>
          <TabsTrigger value="past">گذشته و لغوشده</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="در حال بارگذاری سفرها">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="دریافت سفرها انجام نشد" />
      ) : data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TicketIcon />
            </EmptyMedia>
            <EmptyTitle>
              {when === "upcoming" ? "سفر پیش‌رویی ندارید" : "هنوز سفری در این بخش نیست"}
            </EmptyTitle>
            <EmptyDescription>
              اولین پرواز خود را جست‌وجو کنید؛ قیمت را هم تحلیل می‌کنیم.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={paths.home}>جست‌وجوی پرواز</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul className="flex flex-col gap-3" role="list" aria-busy={isFetching}>
            {data.items.map((booking) => (
              <li key={booking.id}>
                <Card className="p-0">
                  <Link
                    href={paths.booking(booking.id)}
                    className="hover:bg-muted/50 focus-visible:ring-ring/50 grid gap-3 rounded-xl p-4 outline-none focus-visible:ring-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold">
                          {booking.originCityFa} به {booking.destinationCityFa}
                        </span>
                        {booking.returnDepartureUtc && (
                          <span className="text-muted-foreground text-xs">(رفت‌وبرگشت)</span>
                        )}
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {formatDate(booking.departureUtc.slice(0, 10))} ·{" "}
                        {formatNumber(booking.passengerCount)} مسافر · کد رزرو{" "}
                        <bdi dir="ltr" className="tnum">
                          {booking.pnr}
                        </bdi>
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <Toman rial={booking.total} className="text-base" />
                      <ChevronRightIcon
                        className="text-muted-foreground size-4 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>

          {data.meta.totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="صفحه‌بندی">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => void setQuery({ page: page - 1 })}
                aria-label="صفحه‌ی قبل"
              >
                <ChevronLeftIcon className="rtl:rotate-180" />
              </Button>
              <span className="text-muted-foreground tnum text-sm">
                صفحه‌ی {formatNumber(data.meta.page)} از {formatNumber(data.meta.totalPages)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page >= data.meta.totalPages}
                onClick={() => void setQuery({ page: page + 1 })}
                aria-label="صفحه‌ی بعد"
              >
                <ChevronRightIcon className="rtl:rotate-180" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
