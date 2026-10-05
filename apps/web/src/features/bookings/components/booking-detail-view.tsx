"use client";

import type { BookingDto, BookingPassengerDto, BookingSliceDto } from "@flysmart/contracts";
import { MessageCircleQuestionIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FareBreakdownTable, PASSENGER_TYPE_LABELS, RefundPolicyList } from "@/features/flights";
import { formatDateTime, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";

import { useBooking } from "../queries";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelBookingDialog } from "./cancel-booking-dialog";
import { FlightSummaryLine } from "./flight-summary-line";

export function BookingDetailView({ bookingId }: { bookingId: string }) {
  const { data: booking, isPending, isError, error, refetch } = useBooking(bookingId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="در حال بارگذاری بلیت">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} title="رزرو پیدا نشد" />;

  const confirmed = booking.status === "CONFIRMED";
  const departed = booking.slices.every((slice) => slice.departed);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {booking.status === "PENDING_PAYMENT" && (
          <Alert>
            <AlertTitle>پرداخت این رزرو کامل نشده است</AlertTitle>
            <AlertDescription>
              <p>صندلی‌ها تا پایان مهلت پرداخت برایتان نگه داشته می‌شود.</p>
              <Button asChild size="sm" className="mt-2">
                <Link href={paths.checkout(booking.id)}>ادامه‌ی پرداخت</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {booking.status === "CANCELLED" && booking.refund && (
          <Alert>
            <AlertTitle>این رزرو لغو شده است</AlertTitle>
            <AlertDescription>
              <p className="flex flex-wrap items-center gap-x-2">
                مبلغ استردادی: <Toman rial={booking.refund.refundAmount} className="text-sm" />
                {booking.cancelledAt && (
                  <span className="text-muted-foreground">
                    · {formatDateTime(booking.cancelledAt)}
                  </span>
                )}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {booking.slices.map((slice) => (
          <Ticket key={slice.direction} booking={booking} slice={slice} />
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">مسافران</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y" role="list">
              {booking.passengers.map((passenger) => (
                <PassengerRow key={passenger.index} passenger={passenger} booking={booking} />
              ))}
            </ul>
          </CardContent>
        </Card>

        {booking.slices.map((slice) => (
          <Card key={`policy-${slice.direction}`} className="print:hidden">
            <CardHeader>
              <CardTitle className="text-base">
                قوانین استرداد{" "}
                {booking.slices.length > 1
                  ? slice.direction === "OUTBOUND"
                    ? "پرواز رفت"
                    : "پرواز برگشت"
                  : "این پرواز"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RefundPolicyList policy={slice.refundPolicy} />
            </CardContent>
          </Card>
        ))}
      </div>

      <aside
        className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start print:hidden"
        aria-label="جزئیات رزرو"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">رزرو</CardTitle>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              کد رزرو:{" "}
              <bdi dir="ltr" className="text-foreground tnum text-base font-bold">
                {booking.pnr}
              </bdi>
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {booking.slices.map((slice) => (
              <FareBreakdownTable
                key={slice.direction}
                fare={slice.fare}
                seatFees={slice.seatFees}
              />
            ))}
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">جمع پرداختی</span>
              <Toman rial={booking.totals.total} className="text-lg" />
            </div>
            <p className="text-muted-foreground text-xs">
              ثبت: {formatDateTime(booking.createdAt)}
              {booking.paidAt && ` · پرداخت: ${formatDateTime(booking.paidAt)}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {confirmed && (
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  <PrinterIcon data-icon="inline-start" />
                  چاپ بلیت
                </Button>
              )}
              {confirmed && !departed && <CancelBookingDialog booking={booking} />}
              <Button asChild variant="ghost">
                <Link href={`${paths.assistant}?booking=${booking.id}`}>
                  <MessageCircleQuestionIcon data-icon="inline-start" />
                  درباره‌ی این سفر بپرسید
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Ticket({ booking, slice }: { booking: BookingDto; slice: BookingSliceDto }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <FlightSummaryLine
          flight={slice.flight}
          direction={booking.slices.length > 1 ? slice.direction : undefined}
        />
        <dl className="grid grid-cols-2 gap-3 border-t border-dashed pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-xs">کد رزرو</dt>
            <dd className="tnum font-bold" dir="ltr">
              {booking.pnr}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">مسافران</dt>
            <dd className="font-medium">{formatNumber(booking.passengers.length)} نفر</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">فرودگاه مبدأ</dt>
            <dd className="font-medium">{slice.flight.origin.airportNameFa}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">فرودگاه مقصد</dt>
            <dd className="font-medium">{slice.flight.destination.airportNameFa}</dd>
          </div>
        </dl>
        {slice.departed && (
          <p className="text-muted-foreground text-xs">این پرواز انجام شده است.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PassengerRow({
  passenger,
  booking,
}: {
  passenger: BookingPassengerDto;
  booking: BookingDto;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {formatNumber(passenger.index + 1)}. {passenger.firstNameFa} {passenger.lastNameFa}
        </span>
        <span className="text-muted-foreground text-xs">
          {PASSENGER_TYPE_LABELS[passenger.type]}
        </span>
      </div>
      <p className="text-muted-foreground tnum text-xs" dir="ltr">
        {passenger.firstNameEn} {passenger.lastNameEn} · ID {passenger.nationalIdMasked}
        {passenger.passportNumberMasked && ` · PP ${passenger.passportNumberMasked}`}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" role="list">
        {booking.slices.map((slice) => (
          <li key={slice.direction} className="text-muted-foreground">
            {slice.direction === "OUTBOUND" ? "رفت" : "برگشت"}:{" "}
            {passenger.type === "INFANT" ? (
              "بدون صندلی (در آغوش)"
            ) : (
              <>
                صندلی{" "}
                <bdi dir="ltr" className="text-foreground tnum font-medium">
                  {passenger.seats[slice.direction] ?? "—"}
                </bdi>
              </>
            )}
            {passenger.tickets[slice.direction] && (
              <>
                {" "}
                · بلیت{" "}
                <bdi dir="ltr" className="tnum">
                  {passenger.tickets[slice.direction]}
                </bdi>
              </>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}
