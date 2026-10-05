"use client";

import { DESTINATION_SCOPES, normalizeDigits, tomanToRial } from "@flysmart/contracts";
import { ArrowLeftIcon, CompassIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AirportCombobox } from "@/features/search";
import { formatDuration, formatLongDate } from "@/lib/format";
import { paths } from "@/lib/paths";

import { useExplore } from "../queries";

const SCOPE_LABELS: Record<(typeof DESTINATION_SCOPES)[number], string> = {
  all: "همه",
  domestic: "داخلی",
  international: "خارجی",
};

interface Submitted {
  origin: string;
  budget: number;
  scope: string;
}

/** "Where can I go for X?" — the question people actually have when the budget, not the city, is fixed. */
export function ExploreView() {
  const [origin, setOrigin] = useState("THR");
  const [budgetText, setBudgetText] = useState("3000000");
  const [scope, setScope] = useState<(typeof DESTINATION_SCOPES)[number]>("all");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const result = useExplore(submitted);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const toman = Number(normalizeDigits(budgetText).replace(/[,٬\s]/g, ""));
    if (!Number.isFinite(toman) || toman < 500_000) {
      setError("بودجه را به تومان و حداقل ۵۰۰٬۰۰۰ تومان وارد کنید");
      return;
    }
    setError(null);
    setSubmitted({ origin, budget: tomanToRial(toman), scope });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4">
        <form
          onSubmit={submit}
          noValidate
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
          aria-label="جست‌وجو بر اساس بودجه"
        >
          <Field>
            <FieldLabel htmlFor="explore-origin">مبدأ</FieldLabel>
            <AirportCombobox
              id="explore-origin"
              value={origin}
              onChange={setOrigin}
              placeholder="از کجا؟"
            />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="explore-budget">بودجه برای هر نفر (تومان)</FieldLabel>
            <Input
              id="explore-budget"
              value={budgetText}
              onChange={(event) => setBudgetText(event.target.value)}
              inputMode="numeric"
              dir="ltr"
              className="text-start"
              aria-invalid={Boolean(error)}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>قیمت نهایی بلیت با مالیات و کارمزد.</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel id="explore-scope-label">مقصد</FieldLabel>
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(value) => value && setScope(value as typeof scope)}
              aria-labelledby="explore-scope-label"
            >
              {DESTINATION_SCOPES.map((item) => (
                <ToggleGroupItem key={item} value={item}>
                  {SCOPE_LABELS[item]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Button type="submit" size="lg" className="h-10">
            <CompassIcon data-icon="inline-start" />
            پیشنهاد بده
          </Button>
        </form>
      </Card>

      {submitted === null ? (
        <p className="text-muted-foreground text-sm">
          بودجه‌ات را بنویس تا ارزان‌ترین مقصدهای ۳۰ روز آینده را ببینی.
        </p>
      ) : result.isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="در حال جست‌وجو"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : result.isError ? (
        <ErrorState error={result.error} onRetry={() => void result.refetch()} />
      ) : result.data.destinations.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CompassIcon />
            </EmptyMedia>
            <EmptyTitle>مقصدی با این بودجه پیدا نشد</EmptyTitle>
            <EmptyDescription>
              بودجه را کمی بالاتر ببرید یا مبدأ دیگری را امتحان کنید.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {result.data.destinations.map((destination) => (
            <li key={destination.destination}>
              <Card className="p-0">
                <Link
                  href={`${paths.flight(destination.flightId)}?adults=1`}
                  className="hover:bg-muted/50 focus-visible:ring-ring/50 flex h-full flex-col gap-2 rounded-xl p-4 outline-none focus-visible:ring-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-base font-bold">
                      {destination.cityFa}
                      <ArrowLeftIcon
                        className="text-muted-foreground size-3.5"
                        aria-hidden="true"
                      />
                    </span>
                    {destination.international && (
                      <Badge variant="outline">{destination.countryFa}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    ارزان‌ترین روز: {formatLongDate(destination.cheapestDate)} ·{" "}
                    {formatDuration(destination.durationMinutes)}
                  </p>
                  <Toman rial={destination.cheapestPricePerAdult} className="mt-auto text-lg" />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
