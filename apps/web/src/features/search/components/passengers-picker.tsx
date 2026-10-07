"use client";

import { FARE_POLICY } from "@flysmart/contracts";
import { MinusIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatNumber } from "@/lib/format";

export interface PassengerMix {
  adults: number;
  children: number;
  infants: number;
}

interface PassengersPickerProps {
  id?: string;
  value: PassengerMix;
  onChange: (mix: PassengerMix) => void;
}

const MAX = FARE_POLICY.maxPassengersPerBooking;

export function passengerSummary(mix: PassengerMix): string {
  const parts = [`${formatNumber(mix.adults)} بزرگسال`];
  if (mix.children > 0) parts.push(`${formatNumber(mix.children)} کودک`);
  if (mix.infants > 0) parts.push(`${formatNumber(mix.infants)} نوزاد`);
  return parts.join("، ");
}

export function PassengersPicker({ id, value, onChange }: PassengersPickerProps) {
  const [open, setOpen] = useState(false);
  const seated = value.adults + value.children;

  const rows = [
    { key: "adults", label: "بزرگسال", hint: "۱۲ سال به بالا", min: 1, canAdd: seated < MAX },
    { key: "children", label: "کودک", hint: "۲ تا ۱۱ سال", min: 0, canAdd: seated < MAX },
    {
      key: "infants",
      label: "نوزاد",
      hint: "زیر ۲ سال، بدون صندلی",
      min: 0,
      canAdd: value.infants < value.adults,
    },
  ] as const;

  function change(key: keyof PassengerMix, delta: number) {
    const next = { ...value, [key]: value[key] + delta };
    // Every infant needs an adult on whose lap to travel
    if (next.infants > next.adults) next.infants = next.adults;
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-10 w-full justify-start font-normal"
        >
          <UsersIcon data-icon="inline-start" />
          <span className="truncate">{passengerSummary(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{row.label}</span>
                <span className="text-muted-foreground text-xs">{row.hint}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => change(row.key, -1)}
                  disabled={value[row.key] <= row.min}
                  aria-label={`کم کردن ${row.label}`}
                >
                  <MinusIcon />
                </Button>
                <span className="tnum w-5 text-center text-sm font-semibold" aria-live="polite">
                  {formatNumber(value[row.key])}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => change(row.key, 1)}
                  disabled={!row.canAdd}
                  aria-label={`اضافه کردن ${row.label}`}
                >
                  <PlusIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-xs">
          حداکثر {formatNumber(MAX)} مسافر با صندلی در هر رزرو؛ تعداد نوزاد از بزرگسال بیشتر
          نمی‌شود. همراه کودک و نوزاد باید حداقل ۱۸ سال داشته باشد.
        </p>
        <Button type="button" size="sm" className="mt-3 w-full" onClick={() => setOpen(false)}>
          تأیید
        </Button>
      </PopoverContent>
    </Popover>
  );
}
