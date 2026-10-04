"use client";

import type { FareMatrixItemDto } from "@flysmart/contracts";
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, TrendingDownIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/format";

interface FareMatrixBarProps {
  items: FareMatrixItemDto[];
  selectedDate: string;
  minDate?: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}

export function FareMatrixBar({
  items,
  selectedDate,
  minDate,
  onSelectDate,
  isLoading,
}: FareMatrixBarProps) {
  const canGoPrev = minDate ? selectedDate > minDate : true;
  const prevDate = React.useMemo(() => addDays(selectedDate, -1), [selectedDate]);
  const nextDate = React.useMemo(() => addDays(selectedDate, 1), [selectedDate]);

  if (isLoading) {
    return (
      <div className="bg-muted/40 flex h-24 w-full animate-pulse items-center justify-center rounded-2xl border">
        <span className="text-muted-foreground text-xs">در حال دریافت کمترین نرخ‌های تقویم...</span>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="bg-card/75 flex flex-col gap-2 rounded-2xl border p-3.5 shadow-xs">
      {/* Header with Title and Prev/Next Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="text-foreground flex items-center gap-1.5 font-bold">
          <TrendingDownIcon className="size-4 text-emerald-600" />
          <span>تقویم ارزان‌ترین نرخ‌های پرواز (روزهای قبل و بعد)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground ms-2 hidden lg:inline">
            برای تغییر تاریخ و مشاهده پروازهای ارزان‌تر کلیک کنید
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canGoPrev}
              onClick={() => canGoPrev && onSelectDate(prevDate)}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold"
              title={canGoPrev ? `مشاهده روز قبل` : "امکان انتخاب تاریخ گذشته وجود ندارد"}
              aria-label="روز قبل"
            >
              <ChevronRightIcon className="size-3.5" />
              <span>روز قبل</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectDate(nextDate)}
              className="h-7 gap-1 rounded-lg px-2.5 text-xs font-semibold"
              title="مشاهده روز بعد"
              aria-label="روز بعد"
            >
              <span>روز بعد</span>
              <ChevronLeftIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Days Grid - Notice pt-4 pb-2 px-1 so badge -top-2.5 is completely inside and never clipped! */}
      <div className="no-scrollbar grid grid-cols-3 gap-2 overflow-x-auto px-1 pt-4 pb-2 sm:grid-cols-4 md:grid-cols-7">
        {items.map((item) => {
          const isSelected = item.date === selectedDate;
          const isToday = minDate && item.date === minDate;
          const dateObj = new Date(item.date);
          const dayName = isToday
            ? "امروز"
            : dateObj.toLocaleDateString("fa-IR", { weekday: "short" });
          const monthDay = dateObj.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });

          return (
            <button
              key={item.date}
              type="button"
              onClick={() => onSelectDate(item.date)}
              className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground ring-primary/40 shadow-sm ring-2"
                  : "bg-background/90 hover:bg-muted/80 text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {item.isLowestInWeek && (
                <div className="ring-card absolute -top-2.5 z-10 flex items-center gap-0.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-md ring-2">
                  <SparklesIcon className="size-2.5" />
                  <span>ارزان‌ترین</span>
                </div>
              )}

              <span className={`text-xs font-bold ${isSelected ? "text-primary" : ""}`}>
                {dayName}
              </span>
              <span className="text-muted-foreground mb-1 text-[11px]">{monthDay}</span>

              <span
                className={`text-xs font-extrabold ${
                  item.isLowestInWeek
                    ? "text-emerald-600"
                    : isSelected
                      ? "text-primary"
                      : "text-foreground"
                }`}
              >
                {item.lowestPrice.toLocaleString("fa-IR")}
              </span>
              <span className="text-muted-foreground text-[9px]">ریال</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
