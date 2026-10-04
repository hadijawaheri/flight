"use client";

import {
  CheckCircle2Icon,
  ClockIcon,
  PlaneIcon,
  PrinterIcon,
  TicketIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBookings } from "@/features/bookings/queries";
import { paths } from "@/lib/paths";

export default function BookingsHistoryPage() {
  const { data: bookings, isLoading } = useBookings();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-start">
        <div className="flex items-center gap-2">
          <TicketIcon className="text-primary size-6" />
          <h1 className="font-heading text-foreground text-2xl font-bold">
            سفرها و بلیط‌های صادرشده
          </h1>
        </div>
        <p className="text-muted-foreground text-xs">
          تاریخچه تمام رزروها، پیگیری وضعیت پروازها و چاپ مجدد بلیط‌های الکترونیک (E-Ticket).
        </p>
      </div>

      {isLoading ? (
        <div className="flex animate-pulse flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-muted h-32 rounded-2xl" />
          ))}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === "CONFIRMED";
            const isPending = b.status === "PENDING_PAYMENT";

            return (
              <Card
                key={b.id}
                className="bg-card hover:border-primary/40 flex flex-col gap-4 overflow-hidden border p-5 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                      <PlaneIcon className="size-5 rtl:rotate-180" />
                    </div>
                    <div className="flex flex-col text-start">
                      <span className="font-heading text-foreground text-base font-bold">
                        {b.flight.airline} • {b.flight.origin} به {b.flight.destination}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        کد پیگیری (PNR):{" "}
                        <strong className="text-foreground font-mono">{b.bookingReference}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed ? (
                      <Badge className="border-primary/30 bg-primary/10 text-primary gap-1">
                        <CheckCircle2Icon className="size-3.5" />
                        <span>بلیط صادر شد</span>
                      </Badge>
                    ) : isPending ? (
                      <Badge variant="outline" className="gap-1 border-amber-300 text-amber-600">
                        <ClockIcon className="size-3.5" />
                        <span>در انتظار پرداخت</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircleIcon className="size-3.5" />
                        <span>لغو شده</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-4">
                  <div className="flex flex-col text-start">
                    <span className="text-muted-foreground">تاریخ پرواز:</span>
                    <span className="text-foreground font-bold">
                      {new Date(b.flight.departureTime).toLocaleDateString("fa-IR", {
                        dateStyle: "medium",
                      })}
                    </span>
                    <span className="text-muted-foreground">
                      ساعت{" "}
                      {new Date(b.flight.departureTime).toLocaleTimeString("fa-IR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-col text-start">
                    <span className="text-muted-foreground">مسافران:</span>
                    <span className="text-foreground font-bold">{b.passengers.length} نفر</span>
                    <span className="text-muted-foreground line-clamp-1">
                      {b.passengers.map((p) => `${p.firstNameFa} ${p.lastNameFa}`).join("، ")}
                    </span>
                  </div>

                  <div className="flex flex-col text-start">
                    <span className="text-muted-foreground">مبلغ پرداختی:</span>
                    <span className="text-foreground font-mono font-bold">
                      {b.totalAmount.toLocaleString("fa-IR")} ریال
                    </span>
                    <span className="text-muted-foreground">
                      {b.flight.flightType === "CHARTER" ? "چارتری" : "سیستمی"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isConfirmed && (
                      <Link href={paths.checkoutResult(b.id)}>
                        <Button size="sm" variant="outline" className="gap-1.5 font-bold">
                          <PrinterIcon className="size-3.5" />
                          <span>مشاهده و چاپ بلیط</span>
                        </Button>
                      </Link>
                    )}

                    {isPending && (
                      <Link href={paths.checkout(b.id)}>
                        <Button size="sm" className="font-bold">
                          تکمیل و پرداخت
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <TicketIcon className="text-muted-foreground/40 size-12" />
          <h3 className="font-heading text-foreground text-lg font-bold">
            هنوز بلیطی صادر نکرده‌اید
          </h3>
          <p className="text-muted-foreground max-w-sm text-xs">
            اولین سفر خود را با پرواز پلاس تجربه کنید و از بهترین قیمت‌ها و پشتیبانی شبانه‌روزی
            بهره‌مند شوید.
          </p>
          <Link href={paths.flights}>
            <Button size="sm" className="mt-2">
              جستجو و خرید بلیط
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
