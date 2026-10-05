"use client";

import {
  isoToJalali,
  JALALI_MONTH_NAMES,
  jalaliMonthLength,
  jalaliToIso,
  tehranToday,
} from "@flysmart/contracts";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatYear } from "@/lib/format";

interface Parts {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface JalaliDateFieldsProps {
  idPrefix: string;
  /** ISO date, or empty while incomplete. */
  value: string | null | undefined;
  onChange: (iso: string) => void;
  /** Years offered relative to the current Jalali year, e.g. past 110 for birthdays, future 15 for expiry. */
  yearsBack: number;
  yearsAhead: number;
  invalid?: boolean;
  /** Label prefix for screen readers, e.g. "تاریخ تولد". */
  label: string;
}

/**
 * Birthdays sit decades back, where a month-by-month calendar is a chore: three selects are faster
 * on every device. The ISO value is emitted only once all three parts are chosen.
 */
export function JalaliDateFields({
  idPrefix,
  value,
  onChange,
  yearsBack,
  yearsAhead,
  invalid,
  label,
}: JalaliDateFieldsProps) {
  const [draft, setDraft] = useState<Parts>({ year: null, month: null, day: null });
  const parts: Parts = value ? isoToJalali(value) : draft;

  const currentYear = isoToJalali(tehranToday()).year;
  const years: number[] = [];
  // Past dates list newest first; future dates list soonest first.
  if (yearsAhead === 0)
    for (let year = currentYear; year >= currentYear - yearsBack; year -= 1) years.push(year);
  else
    for (let year = currentYear - yearsBack; year <= currentYear + yearsAhead; year += 1)
      years.push(year);

  function update(patch: Partial<Parts>) {
    const next = { ...parts, ...patch };
    if (next.year !== null && next.month !== null && next.day !== null) {
      const day = Math.min(next.day, jalaliMonthLength(next.year, next.month));
      onChange(jalaliToIso(next.year, next.month, day));
      setDraft({ year: null, month: null, day: null });
    } else {
      setDraft(next);
    }
  }

  const maxDay =
    parts.year !== null && parts.month !== null ? jalaliMonthLength(parts.year, parts.month) : 31;

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2" role="group" aria-label={label}>
      <Select
        value={parts.day?.toString() ?? ""}
        onValueChange={(day) => update({ day: Number(day) })}
      >
        <SelectTrigger id={`${idPrefix}-day`} aria-invalid={invalid} aria-label={`${label}: روز`}>
          <SelectValue placeholder="روز" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {Array.from({ length: maxDay }, (_, index) => index + 1).map((day) => (
            <SelectItem key={day} value={String(day)}>
              {formatNumber(day)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={parts.month?.toString() ?? ""}
        onValueChange={(month) => update({ month: Number(month) })}
      >
        <SelectTrigger id={`${idPrefix}-month`} aria-invalid={invalid} aria-label={`${label}: ماه`}>
          <SelectValue placeholder="ماه" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {JALALI_MONTH_NAMES.map((name, index) => (
            <SelectItem key={name} value={String(index + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={parts.year?.toString() ?? ""}
        onValueChange={(year) => update({ year: Number(year) })}
      >
        <SelectTrigger id={`${idPrefix}-year`} aria-invalid={invalid} aria-label={`${label}: سال`}>
          <SelectValue placeholder="سال" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {formatYear(year)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
