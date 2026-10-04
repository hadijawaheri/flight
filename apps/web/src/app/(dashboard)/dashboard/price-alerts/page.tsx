"use client";

import { BellIcon, PlaneIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeletePriceAlert,
  usePriceAlerts,
  useTogglePriceAlert,
} from "@/features/price-alerts/queries";
import { paths } from "@/lib/paths";

export default function PriceAlertsPage() {
  const { data: alerts, isLoading } = usePriceAlerts();
  const toggleMutation = useTogglePriceAlert();
  const deleteMutation = useDeletePriceAlert();

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id, {
      onSuccess: () => {
        toast.success("وضعیت دیده‌بان قیمت تغییر کرد.");
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("آیا از حذف این دیده‌بان اطمینان دارید؟")) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("دیده‌بان حذف شد.");
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <div className="flex items-center gap-2">
            <BellIcon className="text-primary size-6" />
            <h1 className="font-heading text-foreground text-2xl font-bold">
              دیده‌بان‌های فعال قیمت (Price Watchlist)
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            مسیرهایی که زیر نظر گرفته‌اید. به محض کاهش قیمت زیر سقف بودجه شما، پیامک ارسال می‌شود.
          </p>
        </div>

        <Link href={paths.flights}>
          <Button size="sm" className="gap-1.5 font-bold shadow-sm">
            <PlusIcon className="size-4" />
            <span>ثبت دیده‌بان جدید از جستجو</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex animate-pulse flex-col gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-muted h-24 rounded-2xl" />
          ))}
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {alerts.map((a) => {
            const isUnderTarget = a.currentLowestPrice <= a.targetMaxPrice;
            return (
              <Card
                key={a.id}
                className={`flex flex-col justify-between gap-3 border p-4 ${
                  a.isActive ? "bg-card" : "bg-muted/30 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                      <PlaneIcon className="size-5 rtl:rotate-180" />
                    </div>
                    <div className="flex flex-col text-start">
                      <span className="font-heading text-foreground text-base font-bold">
                        {a.originName} به {a.destinationName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {a.targetDate ? `تاریخ مشخص: ${a.targetDate}` : "هر تاریخی در ۳۰ روز آینده"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggle(a.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                        a.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.isActive ? "فعال" : "غیرفعال"}
                    </button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleDelete(a.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl border p-3 text-xs">
                  <div className="flex flex-col text-start">
                    <span className="text-muted-foreground text-[11px]">
                      سقف بودجه درخواستی شما:
                    </span>
                    <span className="text-foreground font-mono font-bold">
                      {a.targetMaxPrice.toLocaleString("fa-IR")} ریال
                    </span>
                  </div>

                  <div className="flex flex-col text-start">
                    <span className="text-muted-foreground text-[11px]">
                      کمترین قیمت کنونی بازار:
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isUnderTarget ? "font-extrabold text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {a.currentLowestPrice.toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                </div>

                {isUnderTarget && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <SparklesIcon className="size-4 text-emerald-600" />
                      <span className="font-bold">قیمت به زیر بودجه شما رسید!</span>
                    </div>
                    <Link
                      href={`${paths.flights}?origin=${a.origin}&destination=${a.destination}&departureDate=${a.targetDate || new Date().toISOString().split("T")[0]}`}
                    >
                      <Button size="xs" className="bg-emerald-600 font-bold hover:bg-emerald-700">
                        خرید الان
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <BellIcon className="text-muted-foreground/40 size-12" />
          <h3 className="font-heading text-foreground text-lg font-bold">
            هیچ دیده‌بانی ثبت نکرده‌اید
          </h3>
          <p className="text-muted-foreground max-w-sm text-xs">
            هنگام جستجوی پروازها، روی دکمه «دیده‌بان کاهش قیمت» کلیک کنید تا به محض ارزان شدن بلیت،
            با پیامک رایگان باخبر شوید.
          </p>
          <Link href={paths.flights}>
            <Button size="sm" className="mt-2">
              جستجو و ثبت دیده‌بان
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
