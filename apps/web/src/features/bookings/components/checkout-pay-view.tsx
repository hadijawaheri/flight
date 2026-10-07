"use client";

import type { BookingDto, PaymentDto } from "@flysmart/contracts";
import { passengerDisplayName } from "@flysmart/contracts";
import { CheckCircle2Icon, CircleAlertIcon, TimerIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FareBreakdownTable } from "@/features/flights";
import { getErrorMessage } from "@/lib/api/parse";
import { formatDateTime, formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { formatCountdown } from "../countdown";
import { useBooking, usePayBooking, usePaymentConfig } from "../queries";
import { useCountdown } from "../use-countdown";
import { BookingStatusBadge } from "./booking-status-badge";
import { FlightSummaryLine } from "./flight-summary-line";
import { SeatPicker } from "./seat-picker";

export function CheckoutPayView({ bookingId }: { bookingId: string }) {
  const booking = useBooking(bookingId);

  if (booking.isPending) {
    return (
      <div
        className="grid gap-6 lg:grid-cols-[1fr_22rem]"
        role="status"
        aria-label="در حال بارگذاری رزرو"
      >
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (booking.isError)
    return (
      <ErrorState
        error={booking.error}
        onRetry={() => void booking.refetch()}
        title="رزرو پیدا نشد"
      />
    );

  return <PayBody booking={booking.data} />;
}

function PayBody({ booking }: { booking: BookingDto }) {
  const pay = usePayBooking(booking.id);
  const config = usePaymentConfig();
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAILURE">("SUCCESS");
  const [seatsDirty, setSeatsDirty] = useState(false);
  const [lastPayment, setLastPayment] = useState<PaymentDto | null>(null);
  const remaining = useCountdown(
    booking.status === "PENDING_PAYMENT" ? booking.holdExpiresAt : null,
  );
  const expiredByClock = remaining === 0;

  if (booking.status === "CONFIRMED") return <Confirmed booking={booking} payment={lastPayment} />;
  if (booking.status === "EXPIRED" || expiredByClock)
    return (
      <Ended
        title="زمان پرداخت تمام شد"
        body="صندلی‌ها آزاد شدند. برای ادامه، پرواز را دوباره جست‌وجو کنید؛ ممکن است قیمت تغییر کرده باشد."
      />
    );
  if (booking.status === "CANCELLED")
    return (
      <Ended title="این رزرو لغو شده است" body="برای سفر جدید، جست‌وجوی تازه‌ای انجام دهید." />
    );

  async function submit() {
    try {
      const result = await pay.mutateAsync({ outcome });
      setLastPayment(result.payment);
    } catch {
      // The mutation keeps the error; it is rendered from `pay.error` below.
      setLastPayment(null);
    }
  }

  const failed = lastPayment && lastPayment.status === "FAILED" ? lastPayment : null;
  const urgent = remaining !== null && remaining <= 120;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
            urgent
              ? "border-warning bg-warning-soft text-warning-ink"
              : "bg-brand-soft text-brand-ink",
          )}
          role="timer"
          aria-label="زمان باقی‌مانده برای پرداخت"
        >
          <span className="flex items-center gap-2 font-medium">
            <TimerIcon className="size-5" aria-hidden="true" />
            صندلی‌ها فقط تا پایان این زمان برای شما نگه داشته می‌شود
          </span>
          <span className="tnum text-2xl font-extrabold" dir="ltr">
            {remaining === null ? "--:--" : formatCountdown(remaining)}
          </span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">پروازهای شما</CardTitle>
              <BookingStatusBadge status={booking.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {booking.slices.map((slice) => (
              <div key={slice.direction} className="border-b pb-4 last:border-b-0 last:pb-0">
                <FlightSummaryLine
                  flight={slice.flight}
                  direction={booking.slices.length > 1 ? slice.direction : undefined}
                />
              </div>
            ))}
            <ul
              className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm"
              role="list"
              aria-label="مسافران"
            >
              {booking.passengers.map((passenger) => (
                <li key={passenger.index}>
                  {formatNumber(passenger.index + 1)}. {passengerDisplayName(passenger)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <SeatPicker booking={booking} onDirtyChange={setSeatsDirty} />
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="پرداخت">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">پرداخت</CardTitle>
            <p className="text-muted-foreground text-xs">
              کد رزرو:{" "}
              <bdi className="text-foreground tnum font-semibold" dir="ltr">
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
            <div className="flex items-baseline justify-between border-t pt-4">
              <span className="font-semibold">مبلغ نهایی</span>
              <Toman rial={booking.totals.total} className="text-xl" />
            </div>

            {config.data?.simulated && (
              <Alert>
                <AlertTitle>درگاه آزمایشی</AlertTitle>
                <AlertDescription>
                  <p>پرداخت واقعی انجام نمی‌شود. نتیجه را برای دیدن هر دو مسیر انتخاب کنید:</p>
                  <ToggleGroup
                    type="single"
                    value={outcome}
                    onValueChange={(value) => value && setOutcome(value as "SUCCESS" | "FAILURE")}
                    className="mt-2"
                    aria-label="نتیجه‌ی پرداخت آزمایشی"
                  >
                    <ToggleGroupItem value="SUCCESS">پرداخت موفق</ToggleGroupItem>
                    <ToggleGroupItem value="FAILURE">پرداخت ناموفق</ToggleGroupItem>
                  </ToggleGroup>
                </AlertDescription>
              </Alert>
            )}

            {failed && (
              <Alert variant="destructive" role="alert">
                <CircleAlertIcon />
                <AlertTitle>پرداخت انجام نشد</AlertTitle>
                <AlertDescription>
                  {failed.failureReason ?? "بانک تراکنش را تأیید نکرد."} مبلغی از حساب شما کسر نشده
                  است. می‌توانید دوباره تلاش کنید.
                </AlertDescription>
              </Alert>
            )}
            {pay.isError && (
              <Alert variant="destructive" role="alert">
                <CircleAlertIcon />
                <AlertTitle>پرداخت انجام نشد</AlertTitle>
                <AlertDescription>{getErrorMessage(pay.error)}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              size="lg"
              onClick={() => void submit()}
              disabled={pay.isPending || seatsDirty}
            >
              {pay.isPending && <Spinner data-icon="inline-start" aria-label="در حال پرداخت" />}
              {failed ? "تلاش دوباره برای پرداخت" : "پرداخت"}
            </Button>
            {seatsDirty && (
              <p className="text-warning-ink text-xs">ابتدا انتخاب صندلی را ذخیره کنید.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Confirmed({ booking, payment }: { booking: BookingDto; payment: PaymentDto | null }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2Icon className="text-primary size-14" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold">پرداخت با موفقیت انجام شد</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          رزرو شما ثبت شد (نسخه‌ی نمایشی: پرداخت و صدور بلیت واقعی نیست). کد رزرو را نزد خود نگه
          دارید. برای زمان حضور در فرودگاه، بار مجاز و مدارک لازم از دستیار بپرسید.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="h-7 px-3 text-sm">
            کد رزرو:{" "}
            <bdi className="tnum" dir="ltr">
              {booking.pnr}
            </bdi>
          </Badge>
          {payment?.referenceId && (
            <Badge variant="outline" className="h-7 px-3 text-sm">
              کد پیگیری:{" "}
              <bdi className="tnum" dir="ltr">
                {payment.referenceId}
              </bdi>
            </Badge>
          )}
        </div>
        {booking.paidAt && (
          <p className="text-muted-foreground text-xs">
            زمان پرداخت: {formatDateTime(booking.paidAt)}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size="lg">
            <Link href={paths.booking(booking.id)}>مشاهده‌ی بلیت</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={paths.assistant}>چه چیزی همراه ببرم؟ از دستیار بپرسید</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Ended({ title, body }: { title: string; body: string }) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <CircleAlertIcon className="text-warning-ink size-12" aria-hidden="true" />
        <h1 className="text-xl font-extrabold">{title}</h1>
        <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
        <Button asChild size="lg">
          <Link href={paths.home}>جست‌وجوی دوباره</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
