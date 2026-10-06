"use client";

import type { PriceAlertDto, PriceAlertStatus } from "@flysmart/contracts";
import { tomanToRial } from "@flysmart/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api/parse";
import { formatLongDate, formatTomanNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { useDeletePriceAlert, usePriceAlerts, useUpdatePriceAlert } from "../queries";
import { type TargetFormInput, type TargetFormOutput, targetFormSchema } from "../target-schema";

const STATUS_LABELS: Record<PriceAlertStatus, string> = {
  ACTIVE: "فعال",
  TRIGGERED: "به هدف رسید",
  EXPIRED: "منقضی",
};
const STATUS_STYLES: Record<PriceAlertStatus, string> = {
  ACTIVE: "bg-brand-soft text-brand-ink",
  TRIGGERED: "bg-warning-soft text-warning-ink",
  EXPIRED: "bg-muted text-muted-foreground",
};

export function PriceAlertsManager() {
  const { data, isPending, isError, error, refetch } = usePriceAlerts();
  const [editing, setEditing] = useState<PriceAlertDto | null>(null);
  const [removing, setRemoving] = useState<PriceAlertDto | null>(null);
  const remove = useDeletePriceAlert();

  async function confirmRemove() {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
      toast.success("هشدار حذف شد.");
      setRemoving(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="در حال بارگذاری هشدارها">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError)
    return (
      <ErrorState error={error} onRetry={() => void refetch()} title="دریافت هشدارها انجام نشد" />
    );

  if (data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon />
          </EmptyMedia>
          <EmptyTitle>هشدار قیمتی ندارید</EmptyTitle>
          <EmptyDescription>
            در صفحه‌ی هر پرواز، «هشدار قیمت» را بزنید تا با رسیدن به قیمت دلخواهتان خبر بدهیم.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={paths.home}>جست‌وجوی پرواز</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3" role="list">
        {data.map((alert) => (
          <li key={alert.id}>
            <Card className="gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold">
                    {alert.originCityFa} به {alert.destinationCityFa}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {formatLongDate(alert.date)} ·{" "}
                    {alert.cabin === "BUSINESS" ? "بیزینس" : "اکونومی"}
                  </span>
                </div>
                <Badge variant="secondary" className={cn(STATUS_STYLES[alert.status])}>
                  {STATUS_LABELS[alert.status]}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">قیمت هدف</dt>
                  <dd>
                    <Toman rial={alert.targetPrice} className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">ارزان‌ترین قیمت الان</dt>
                  <dd>
                    {alert.currentLowestPrice === null ? (
                      "پروازی نیست"
                    ) : (
                      <Toman rial={alert.currentLowestPrice} className="text-sm" />
                    )}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                {alert.status === "TRIGGERED" && alert.triggeredFlightId && (
                  <Button asChild size="sm">
                    <Link href={paths.flight(alert.triggeredFlightId)}>
                      مشاهده‌ی پرواز
                      {alert.triggeredPrice
                        ? ` (${formatTomanNumber(alert.triggeredPrice)} تومان)`
                        : ""}
                    </Link>
                  </Button>
                )}
                {alert.status === "ACTIVE" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(alert)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    ویرایش هدف
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(alert)}>
                  <Trash2Icon data-icon="inline-start" />
                  حذف
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {editing && (
        <EditTargetDialog key={editing.id} alert={editing} onClose={() => setEditing(null)} />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف این هشدار؟</AlertDialogTitle>
            <AlertDialogDescription>
              دیگر برای این مسیر و تاریخ خبرتان نمی‌کنیم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
              disabled={remove.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditTargetDialog({ alert, onClose }: { alert: PriceAlertDto; onClose: () => void }) {
  const update = useUpdatePriceAlert();
  const form = useForm<TargetFormInput, unknown, TargetFormOutput>({
    resolver: zodResolver(targetFormSchema),
    mode: "onTouched",
    defaultValues: { targetToman: String(Math.round(alert.targetPrice / 10)) },
  });

  const onSubmit = form.handleSubmit(async ({ targetToman }) => {
    try {
      await update.mutateAsync({ id: alert.id, targetPrice: tomanToRial(targetToman) });
      toast.success("قیمت هدف تغییر کرد.");
      onClose();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ویرایش قیمت هدف</DialogTitle>
          <DialogDescription>
            {alert.originCityFa} به {alert.destinationCityFa} · {formatLongDate(alert.date)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Controller
            name="targetToman"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="edit-target">قیمت هدف (تومان)</FieldLabel>
                <Input
                  {...field}
                  id="edit-target"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-start"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Spinner data-icon="inline-start" aria-label="در حال ذخیره" />}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
