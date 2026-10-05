"use client";

import type { BookingDto } from "@flysmart/contracts";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { formatNumber, formatPercent } from "@/lib/format";

import { useCancelBooking, useRefundQuote } from "../queries";

export function CancelBookingDialog({ booking }: { booking: BookingDto }) {
  const [open, setOpen] = useState(false);
  const quote = useRefundQuote(booking.id, open);
  const cancel = useCancelBooking(booking.id);

  async function confirm() {
    try {
      await cancel.mutateAsync();
      toast.success("رزرو لغو شد و مبلغ قابل استرداد ثبت گردید.");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          لغو و استرداد
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>لغو این رزرو؟</AlertDialogTitle>
          <AlertDialogDescription>
            مبلغ دقیق استرداد را پیش از تأیید می‌بینید. لغو قابل بازگشت نیست.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {quote.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : quote.isError ? (
          <ErrorState error={quote.error} onRetry={() => void quote.refetch()} />
        ) : !quote.data.cancellable ? (
          <p className="text-destructive text-sm">
            {quote.data.blockedReason ?? "امکان لغو این رزرو وجود ندارد."}
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <ul className="flex flex-col gap-2" role="list">
              {quote.data.slices.map((slice) => (
                <li key={slice.direction} className="bg-muted flex flex-col gap-1 rounded-lg p-3">
                  <span className="font-semibold">
                    {slice.direction === "OUTBOUND" ? "پرواز رفت" : "پرواز برگشت"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatNumber(Math.max(0, Math.round(slice.hoursBeforeDeparture)))} ساعت تا
                    پرواز · {slice.result.tierLabel} · جریمه{" "}
                    {formatPercent(slice.result.penaltyPercent)}
                  </span>
                  <span className="flex items-center justify-between">
                    <span>قابل استرداد</span>
                    <Toman rial={slice.result.refundAmount} className="text-sm" />
                  </span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">جریمه‌ی لغو</dt>
                <dd>
                  <Toman rial={quote.data.totalPenalty} className="text-sm" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">کارمزد خدمات (برگشت‌ناپذیر)</dt>
                <dd>
                  <Toman rial={quote.data.totalNonRefundableFees} className="text-sm" />
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>جمع استرداد</dt>
                <dd>
                  <Toman rial={quote.data.totalRefund} className="text-base" />
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              زمان برگشت پول به حساب بسته به بانک شما از چند روز تا چند هفته است.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>انصراف</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void confirm()}
            disabled={cancel.isPending || !quote.data?.cancellable}
          >
            {cancel.isPending && <Spinner data-icon="inline-start" aria-label="در حال لغو" />}
            تأیید لغو
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
