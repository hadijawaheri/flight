"use client";

import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCheapDeals } from "@/features/deals/queries";
import { paths } from "@/lib/paths";

export default function DealsPage() {
  const { data: deals, isLoading } = useCheapDeals();

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex max-w-2xl flex-col gap-2 text-start">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-6 text-amber-500" />
          <h1 className="font-heading text-foreground text-3xl font-extrabold">
            آفرهای شگفت‌انگیز و پروازهای لحظه آخری
          </h1>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          فرصت‌های استثنایی سفر با تا ۵۰٪ تخفیف واقعی. قیمت‌ها به صورت خودکار از پروازهای کنسلی و
          چارتری استخراج می‌شوند و ظرفیت آن‌ها محدود است.
        </p>
      </div>

      {isLoading ? (
        <div className="grid animate-pulse grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-muted h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {deals?.map((deal) => (
            <Card
              key={deal.id}
              className="group hover:border-primary/40 overflow-hidden border transition-all hover:shadow-xl"
            >
              <div className="flex h-full flex-col justify-between gap-5 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-heading text-foreground text-xl font-bold">
                      {deal.origin} به {deal.destination}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      زمان پرواز: {deal.departureDate}
                    </span>
                    <span className="text-foreground/80 mt-1 text-xs font-semibold">
                      ایرلاین: {deal.airline}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600"
                    >
                      {deal.discountPercent}٪ تخفیف
                    </Badge>
                    <span className="text-[10px] font-medium text-amber-600">
                      فقط {deal.remainingSeats} صندلی باقی‌مانده!
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs line-through">
                      {deal.regularPrice.toLocaleString("fa-IR")}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-primary text-2xl font-black">
                        {deal.dealPrice.toLocaleString("fa-IR")}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">ریال</span>
                    </div>
                  </div>

                  <Link
                    href={`${paths.flights}?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${deal.departureDate || new Date().toISOString().split("T")[0]}`}
                  >
                    <Button className="shadow-primary/20 gap-1 font-bold shadow-md">
                      <span>رزرو فوری</span>
                      <ArrowLeftIcon className="size-4 rtl:rotate-180" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
