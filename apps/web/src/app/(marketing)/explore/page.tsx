"use client";

import { ArrowLeftIcon, CompassIcon, PlaneIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBudgetExplore } from "@/features/deals/queries";
import { paths } from "@/lib/paths";

export default function ExplorePage() {
  const [budgetTomans, setBudgetTomans] = React.useState(2_000_000); // 2 Million Tomans
  const budgetRials = budgetTomans * 10;

  const { data: destinations, isLoading } = useBudgetExplore({
    origin: "THR",
    maxBudget: budgetRials,
  });

  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex max-w-2xl flex-col gap-2 text-start">
        <div className="flex items-center gap-2">
          <CompassIcon className="text-primary size-6" />
          <h1 className="font-heading text-foreground text-3xl font-extrabold">کاوشگر بودجه سفر</h1>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          نمی‌دانید با بودجه‌تان به کجا می‌توانید سفر کنید؟ کافیست سقف مبلغ مورد نظرتان را مشخص کنید
          تا تمام مقاصد و ارزان‌ترین روزهای سفر برای شما لیست شوند.
        </p>
      </div>

      {/* Interactive Budget Control Card */}
      <Card className="bg-card/80 flex flex-col gap-5 border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-semibold">
              حداکثر بودجه شما برای یک بلیط:
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-primary text-3xl font-black">
                {budgetTomans.toLocaleString("fa-IR")}
              </span>
              <span className="text-foreground text-sm font-bold">تومان</span>
              <span className="text-muted-foreground text-xs">
                ({budgetRials.toLocaleString("fa-IR")} ریال)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1_500_000, 2_000_000, 2_500_000, 3_000_000, 4_000_000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBudgetTomans(amount)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  budgetTomans === amount
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {(amount / 1_000_000).toLocaleString("fa-IR")} میلیون
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={1_000_000}
            max={5_000_000}
            step={250_000}
            value={budgetTomans}
            onChange={(e) => setBudgetTomans(Number(e.target.value))}
            className="accent-primary bg-muted h-2 w-full cursor-pointer rounded-lg"
          />
          <div className="text-muted-foreground flex justify-between text-[11px]">
            <span>۱ میلیون تومان</span>
            <span>۳ میلیون تومان</span>
            <span>۵ میلیون تومان</span>
          </div>
        </div>
      </Card>

      {/* Reachable Destinations Grid */}
      <div className="flex flex-col gap-4">
        <span className="text-foreground text-sm font-bold">
          مقاصدی که با این بودجه می‌توانید سفر کنید:
        </span>

        {isLoading ? (
          <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-muted h-44 rounded-2xl" />
            ))}
          </div>
        ) : destinations && destinations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((dest) => (
              <Card
                key={dest.destinationCode}
                className="group hover:border-primary/40 overflow-hidden border transition-all hover:shadow-lg"
              >
                <div className="flex h-full flex-col justify-between gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                        <PlaneIcon className="size-5 rtl:rotate-180" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-heading text-foreground text-lg font-bold">
                          {dest.destination}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {dest.destinationCode}
                        </span>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px]">
                      {dest.availableFlightsCount} پرواز
                    </Badge>
                  </div>

                  <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                    {dest.description}
                  </p>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px]">کمترین نرخ:</span>
                      <span className="font-heading text-primary text-base font-bold">
                        {dest.minPrice.toLocaleString("fa-IR")} ریال
                      </span>
                    </div>

                    <Link
                      href={`${paths.flights}?origin=THR&destination=${dest.destinationCode}&departureDate=${dest.bestDate}`}
                    >
                      <Button size="xs" className="gap-1 font-semibold">
                        <span>مشاهده</span>
                        <ArrowLeftIcon className="size-3 rtl:rotate-180" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 border-dashed p-12 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <CompassIcon className="size-6" />
            </div>
            <h3 className="font-heading text-foreground text-base font-bold">
              مقصدی با این سقف بودجه پیدا نشد
            </h3>
            <p className="text-muted-foreground max-w-sm text-xs">
              می‌توانید با کشیدن اسلایدر به سمت راست، سقف بودجه خود را افزایش دهید تا پروازهای مناسب
              نمایش داده شوند.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBudgetTomans(3_000_000)}
              className="mt-2 text-xs"
            >
              تنظیم بودجه روی ۳ میلیون تومان
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
