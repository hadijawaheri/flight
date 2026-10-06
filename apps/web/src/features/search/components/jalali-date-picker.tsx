"use client";

import {
  addJalaliMonths,
  isoToJalali,
  JALALI_MONTH_NAMES,
  jalaliMonthDays,
  jalaliMonthStartWeekday,
  officialHolidayName,
  PERSIAN_WEEKDAY_SHORT,
} from "@flysmart/contracts";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatJalaliShort, formatLongDate, formatNumber, formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";

interface JalaliDatePickerProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable day (ISO). */
  min: string;
  /** Latest selectable day (ISO). */
  max?: string;
  placeholder?: string;
  invalid?: boolean;
}

export function JalaliDatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "انتخاب تاریخ",
  invalid,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const anchor = isoToJalali(value || min);
  const [view, setView] = useState({ year: anchor.year, month: anchor.month });

  const days = jalaliMonthDays(view.year, view.month);
  const leadingBlanks = jalaliMonthStartWeekday(view.year, view.month);

  const canGoBack = jalaliMonthDays(view.year, view.month)[0]!.iso > min;
  const lastIso = days[days.length - 1]!.iso;
  const canGoForward = max === undefined || lastIso < max;

  function move(delta: number) {
    setView((current) => addJalaliMonths(current.year, current.month, delta));
  }

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const target = isoToJalali(value || min);
          setView({ year: target.year, month: target.month });
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className="h-10 w-full justify-start font-normal"
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? (
            <span className="tnum">{formatJalaliShort(value)}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => move(-1)}
            disabled={!canGoBack}
            aria-label="ماه قبل"
          >
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Button>
          <div className="text-sm font-semibold" aria-live="polite">
            {JALALI_MONTH_NAMES[view.month - 1]} {formatYear(view.year)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => move(1)}
            disabled={!canGoForward}
            aria-label="ماه بعد"
          >
            <ChevronRightIcon className="rtl:rotate-180" />
          </Button>
        </div>
        <div
          className="text-muted-foreground mb-1 grid grid-cols-7 text-center text-xs"
          aria-hidden="true"
        >
          {PERSIAN_WEEKDAY_SHORT.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {days.map(({ iso, day }) => {
            const disabled = iso < min || (max !== undefined && iso > max);
            const selected = iso === value;
            const holiday = officialHolidayName(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => pick(iso)}
                aria-label={formatLongDate(iso)}
                aria-pressed={selected}
                title={holiday ?? undefined}
                className={cn(
                  "tnum focus-visible:ring-ring/50 mx-auto flex size-9 items-center justify-center rounded-lg text-sm transition-colors outline-none focus-visible:ring-3",
                  "hover:bg-muted disabled:pointer-events-none disabled:opacity-30",
                  holiday && !selected && "text-destructive",
                  selected && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {formatNumber(day)}
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          روزهای قرمز تعطیل رسمی‌اند؛ معمولاً بلیت آن‌ها گران‌تر است.
        </p>
      </PopoverContent>
    </Popover>
  );
}
