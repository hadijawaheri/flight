"use client";

import type {
  FlightOfferDto,
  FlightSearchResultDto,
  FlightType,
  TimeBucket,
} from "@flysmart/contracts";
import { FLIGHT_TYPES, TIME_BUCKETS } from "@flysmart/contracts";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatNumber, formatTomanNumber } from "@/lib/format";

import { activeFilterCount, countByTimeBucket, type OfferFilters } from "../filter-offers";
import { FLIGHT_TYPE_LABELS, TIME_BUCKET_LABELS } from "../labels";

interface FiltersPanelProps {
  /** Every offer of the search, unfiltered: counts must not shrink as the traveller narrows down. */
  offers: readonly FlightOfferDto[];
  summary: FlightSearchResultDto["summary"];
  filters: OfferFilters;
  onChange: (patch: Partial<OfferFilters>) => void;
  onReset: () => void;
}

const PRICE_STEP_RIAL = 500_000;

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function FiltersPanel({ offers, summary, filters, onChange, onReset }: FiltersPanelProps) {
  const timeCounts = countByTimeBucket(offers);
  const hasCharter = offers.some((offer) => offer.flightType === "CHARTER");
  const hasSystemic = offers.some((offer) => offer.flightType === "SYSTEMIC");

  const floor = Math.floor((summary.minPricePerAdult ?? 0) / PRICE_STEP_RIAL) * PRICE_STEP_RIAL;
  const ceiling = Math.ceil((summary.maxPricePerAdult ?? 0) / PRICE_STEP_RIAL) * PRICE_STEP_RIAL;
  const [draftPrice, setDraftPrice] = useState<number | null>(null);
  const shownPrice = draftPrice ?? filters.maxPrice ?? ceiling;
  const active = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">فیلتر نتایج</h2>
        {active > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            حذف فیلترها ({formatNumber(active)})
          </Button>
        )}
      </div>

      {summary.airlines.length > 1 && (
        <FieldSet>
          <FieldLegend variant="label">ایرلاین</FieldLegend>
          <div className="flex flex-col gap-2.5">
            {summary.airlines.map((airline) => (
              <Field key={airline.code} orientation="horizontal">
                <Checkbox
                  id={`airline-${airline.code}`}
                  checked={filters.airlines.includes(airline.code)}
                  onCheckedChange={() =>
                    onChange({ airlines: toggled(filters.airlines, airline.code) })
                  }
                />
                <FieldLabel htmlFor={`airline-${airline.code}`} className="flex-1 font-normal">
                  <span className="flex-1">{airline.nameFa}</span>
                  <span className="text-muted-foreground tnum text-xs">
                    از {formatTomanNumber(airline.minPricePerAdult)}
                  </span>
                </FieldLabel>
              </Field>
            ))}
          </div>
        </FieldSet>
      )}

      <FieldSet>
        <FieldLegend variant="label">ساعت حرکت</FieldLegend>
        <div className="flex flex-col gap-2.5">
          {TIME_BUCKETS.map((bucket: TimeBucket) => (
            <Field key={bucket} orientation="horizontal">
              <Checkbox
                id={`time-${bucket}`}
                checked={filters.times.includes(bucket)}
                disabled={timeCounts[bucket] === 0}
                onCheckedChange={() => onChange({ times: toggled(filters.times, bucket) })}
              />
              <FieldLabel htmlFor={`time-${bucket}`} className="flex-1 font-normal">
                <span className="flex-1">{TIME_BUCKET_LABELS[bucket]}</span>
                <span className="text-muted-foreground tnum text-xs">
                  {formatNumber(timeCounts[bucket])}
                </span>
              </FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>

      {hasCharter && hasSystemic && (
        <FieldSet>
          <FieldLegend variant="label">نوع پرواز</FieldLegend>
          <ToggleGroup
            type="single"
            value={filters.type ?? "ALL"}
            onValueChange={(value) => {
              if (!value) return;
              onChange({ type: value === "ALL" ? null : (value as FlightType) });
            }}
            aria-label="نوع پرواز"
          >
            <ToggleGroupItem value="ALL">همه</ToggleGroupItem>
            {FLIGHT_TYPES.map((type) => (
              <ToggleGroupItem key={type} value={type}>
                {FLIGHT_TYPE_LABELS[type]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-muted-foreground text-xs">
            پروازهای چارتری معمولاً ارزان‌ترند، اما قوانین استرداد و تغییرشان سخت‌گیرانه‌تر است.
          </p>
        </FieldSet>
      )}

      {ceiling > floor && (
        <FieldSet>
          <FieldLegend variant="label">حداکثر قیمت برای هر بزرگسال</FieldLegend>
          <Slider
            min={floor}
            max={ceiling}
            step={PRICE_STEP_RIAL}
            value={[shownPrice]}
            onValueChange={([value]) => setDraftPrice(value ?? null)}
            onValueCommit={([value]) => {
              setDraftPrice(null);
              onChange({ maxPrice: value === undefined || value >= ceiling ? null : value });
            }}
            aria-label="حداکثر قیمت"
          />
          <p className="text-muted-foreground tnum text-xs">
            تا <bdi className="text-foreground font-semibold">{formatTomanNumber(shownPrice)}</bdi>{" "}
            تومان
          </p>
        </FieldSet>
      )}
    </div>
  );
}
