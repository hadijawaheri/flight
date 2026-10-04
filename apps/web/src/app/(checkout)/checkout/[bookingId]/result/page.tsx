"use client";

import { ArrowLeftIcon, CheckCircle2Icon, PlaneIcon, PrinterIcon, QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBookingDetail, useVerifyPayment } from "@/features/bookings/queries";
import { paths } from "@/lib/paths";

function CheckoutResultContent() {
  const params = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId;

  const authority = searchParams.get("Authority") || searchParams.get("authority") || "MOCK-AUTH";
  const status = searchParams.get("Status") || searchParams.get("status") || "OK";

  const { data: booking, isLoading, refetch } = useBookingDetail(bookingId);
  const verifyPaymentMutation = useVerifyPayment();
  const mutateVerify = verifyPaymentMutation.mutate;
  const hasTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (booking && booking.status !== "CONFIRMED" && status === "OK" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      mutateVerify(
        {
          authority,
          status,
          bookingId,
        },
        {
          onSuccess: (receipt) => {
            if (receipt.isSuccessful) {
              toast.success("پرداخت با موفقیت تأیید شد و بلیط‌های الکترونیک صادر گردیدند!");
              refetch();
            }
          },
          onError: () => {
            hasTriggeredRef.current = false;
          },
        },
      );
    }
  }, [booking, authority, status, bookingId, refetch, mutateVerify]);

  if (isLoading || verifyPaymentMutation.isPending) {
    return (
      <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent" />
        <span className="text-muted-foreground text-sm font-semibold">
          در حال استعلام و صدور رسمی بلیط...
        </span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold">رزرو یافت نشد</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      {/* Success Notification Banner */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-950 sm:flex-row dark:text-emerald-100">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2Icon className="size-7" />
          </div>
          <div className="flex flex-col text-start">
            <h1 className="font-heading text-xl font-bold">پرداخت موفق و صدور قطعی بلیط!</h1>
            <p className="text-xs opacity-90">
              پیامک حاوی لینک بلیط به شماره {booking.contactMobile} ارسال شد.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="bg-background text-foreground gap-1.5"
          >
            <PrinterIcon className="size-4" />
            <span>چاپ بلیط</span>
          </Button>
          <Link href={paths.bookings}>
            <Button size="sm" className="gap-1.5 font-bold">
              <span>سفرهای من</span>
              <ArrowLeftIcon className="size-4 rtl:rotate-180" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Official Electronic Flight Ticket (E-Ticket) Card */}
      <Card className="border-primary/20 bg-card overflow-hidden border-2 shadow-xl">
        {/* Ticket Header */}
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
              <PlaneIcon className="size-5 rtl:rotate-180" />
            </div>
            <div className="flex flex-col text-start">
              <span className="font-heading text-foreground text-lg font-bold">
                بلیط الکترونیک پرواز (E-Ticket)
              </span>
              <span className="text-muted-foreground text-[11px]">
                سامانه رزرواسیون هواپیمایی پرواز پلاس
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">شماره پیگیری (PNR):</span>
              <span className="text-primary font-mono text-base font-extrabold">
                {booking.bookingReference}
              </span>
            </div>
          </div>
        </div>

        {/* Flight Details Section */}
        <div className="flex flex-col gap-6 p-6">
          <div className="bg-muted/20 grid grid-cols-1 gap-4 rounded-2xl border p-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1 text-start">
              <span className="text-muted-foreground text-xs">شرکت هواپیمایی:</span>
              <span className="text-foreground text-sm font-bold">{booking.flight.airline}</span>
              <span className="text-muted-foreground text-xs">{booking.flight.flightNumber}</span>
            </div>

            <div className="flex flex-col gap-1 text-start">
              <span className="text-muted-foreground text-xs">مسیر پرواز:</span>
              <span className="text-foreground text-sm font-bold">
                {booking.flight.origin} به {booking.flight.destination}
              </span>
              <span className="text-muted-foreground text-xs">
                {booking.flight.originCode} ← {booking.flight.destinationCode}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-start">
              <span className="text-muted-foreground text-xs">تاریخ و ساعت حرکت:</span>
              <span className="text-foreground text-sm font-bold">
                {new Date(booking.flight.departureTime).toLocaleTimeString("fa-IR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(booking.flight.departureTime).toLocaleDateString("fa-IR", {
                  dateStyle: "medium",
                })}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-start">
              <span className="text-muted-foreground text-xs">نوع پرواز و کلاس:</span>
              <span className="text-foreground text-sm font-bold">
                {booking.flight.flightClass === "BUSINESS" ? "بیزینس کلاس" : "اکونومی"}
              </span>
              <span className="text-muted-foreground text-xs">
                {booking.flight.flightType === "CHARTER" ? "چارتری" : "سیستمی"} • بار:{" "}
                {booking.flight.baggageAllowanceKg} ک‌گ
              </span>
            </div>
          </div>

          {/* Passenger Boarding Passes */}
          <div className="flex flex-col gap-3">
            <h3 className="font-heading text-foreground text-sm font-bold">
              کارت‌های پرواز مسافران:
            </h3>
            <div className="flex flex-col gap-3">
              {booking.passengers.map((p, index) => {
                const ticket = booking.tickets[index];
                return (
                  <div
                    key={p.id}
                    className="bg-background hover:border-primary/40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex flex-col text-start">
                        <span className="font-heading text-foreground text-base font-bold">
                          {p.firstNameFa} {p.lastNameFa}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {p.firstNameEn} {p.lastNameEn} • کد ملی: {p.nationalId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-[11px]">شماره صندلی</span>
                        <span className="text-primary font-mono text-base font-black">
                          {p.seatNumber || `1${index + 1}A`}
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-[11px]">شماره بلیط</span>
                        <span className="text-foreground font-mono text-xs font-bold">
                          {ticket?.ticketNumber || `724-1029482${index}`}
                        </span>
                      </div>

                      <div className="bg-muted/40 hidden size-14 items-center justify-center rounded-lg border p-1 sm:flex">
                        <QrCodeIcon className="text-foreground size-10" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules and Notice */}
          <div className="bg-muted/30 text-muted-foreground flex flex-col gap-2 rounded-xl border p-4 text-xs">
            <span className="text-foreground font-bold">نکات مهم پرواز:</span>
            <ul className="list-inside list-disc space-y-1">
              <li>
                حداقل ۱.۵ ساعت قبل از پروازهای داخلی و ۳ ساعت قبل از پروازهای خارجی در فرودگاه حاضر
                باشید.
              </li>
              <li>
                همراه داشتن اصل کارت ملی برای پروازهای داخلی و گذرنامه با حداقل ۶ ماه اعتبار برای
                پروازهای بین‌المللی الزامی است.
              </li>
              <li>
                این بلیط دارای تاییدیه رسمی سازمان هواپیمایی کشوری است و نیازی به پرینت کاغذی ندارد
                (نشان دادن بارکد در گوشی کافیست).
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <React.Suspense
      fallback={
        <div className="text-muted-foreground container mx-auto px-4 py-20 text-center">
          <div className="border-primary inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent align-[-0.125em]" />
          <p className="mt-4 font-medium">در حال تایید و صدور بلیط...</p>
        </div>
      }
    >
      <CheckoutResultContent />
    </React.Suspense>
  );
}
