"use client";

import type { UserDto } from "@flysmart/contracts";
import { BellIcon, ChevronRightIcon, PlaneTakeoffIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { Toman } from "@/components/shared/toman";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge, useBookings } from "@/features/bookings";
import { usePassengers } from "@/features/passengers";
import { usePriceAlerts } from "@/features/price-alerts";
import { formatDate, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

export function DashboardOverview({ user }: { user: UserDto }) {
  const upcoming = useBookings({ page: 1, limit: 3, when: "upcoming" });
  const alerts = usePriceAlerts();
  const passengers = usePassengers();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const activeAlerts = alerts.data?.filter((alert) => alert.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {name ? `سلام ${name}` : "سلام"}
          </h1>
          <p className="text-muted-foreground text-sm">
            سفرهای پیش‌رو، مسافران و هشدارهای قیمتتان یک‌جا.
          </p>
        </div>
        <Button asChild>
          <Link href={paths.home}>
            <PlaneTakeoffIcon data-icon="inline-start" />
            پرواز جدید
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryTile
          href={paths.priceAlerts}
          icon={<BellIcon className="size-5" aria-hidden="true" />}
          label="هشدار قیمت فعال"
          value={activeAlerts === undefined ? null : formatNumber(activeAlerts)}
        />
        <SummaryTile
          href={paths.passengers}
          icon={<UsersIcon className="size-5" aria-hidden="true" />}
          label="مسافر ذخیره‌شده"
          value={passengers.data ? formatNumber(passengers.data.length) : null}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سفرهای پیش‌رو</CardTitle>
          <CardDescription>تا سه سفر نزدیک‌تر.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : upcoming.isError || upcoming.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              سفر پیش‌رویی ندارید.{" "}
              <Link href={paths.home} className="text-primary underline underline-offset-4">
                یک پرواز جست‌وجو کنید
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y" role="list">
              {upcoming.data.items.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={paths.booking(booking.id)}
                    className="hover:bg-muted/50 focus-visible:ring-ring/50 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 outline-none focus-visible:ring-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {booking.originCityFa} به {booking.destinationCityFa}
                        <BookingStatusBadge status={booking.status} />
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(booking.departureUtc.slice(0, 10))}
                      </span>
                    </div>
                    <span className="flex items-center gap-2">
                      <Toman rial={booking.total} className="text-sm" />
                      <ChevronRightIcon
                        className="text-muted-foreground size-4 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <Link
      href={href}
      className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="hover:bg-muted/50 flex-row items-center gap-4 p-4">
        <span className="bg-brand-soft text-brand-ink flex size-10 items-center justify-center rounded-lg">
          {icon}
        </span>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">{label}</span>
          {value === null ? (
            <Skeleton className="h-6 w-8" />
          ) : (
            <span className="tnum text-2xl font-extrabold">{value}</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
