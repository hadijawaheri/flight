"use client";

import type { Cabin, InsightReason } from "@flysmart/contracts";
import {
  BellIcon,
  CircleCheckIcon,
  ClockIcon,
  InfoIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/shared/error-state";
import { Toman } from "@/components/shared/toman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceAlertForm } from "@/features/price-alerts";
import { formatJalaliShort, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ADVICE_LABELS, TREND_LABELS, VERDICT_LABELS } from "../labels";
import { usePriceAnalysis } from "../queries";
import { PriceChart } from "./price-chart";

interface PriceAnalysisPanelProps {
  flightId: string;
  origin: string;
  destination: string;
  date: string;
  cabin: Cabin;
  /** Where a cheaper neighbouring day leads. */
  dateHref: (date: string) => string;
}

const REASON_ICON: Record<InsightReason["tone"], typeof InfoIcon> = {
  positive: CircleCheckIcon,
  negative: ClockIcon,
  neutral: InfoIcon,
};

export function PriceAnalysisPanel({
  flightId,
  origin,
  destination,
  date,
  cabin,
  dateHref,
}: PriceAnalysisPanelProps) {
  const { data, isPending, isError, error, refetch } = usePriceAnalysis(flightId);

  if (isPending) {
    return (
      <Card role="status" aria-label="در حال تحلیل قیمت">
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (isError)
    return (
      <ErrorState error={error} onRetry={() => void refetch()} title="تحلیل قیمت در دسترس نیست" />
    );

  const { insight } = data;
  const buy = insight.advice === "BUY_NOW";
  const AdviceIcon = buy ? TrendingUpIcon : ClockIcon;
  const ChangeIcon = insight.expectedChangePercent >= 0 ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تحلیل قیمت</CardTitle>
        <CardDescription>
          بر پایه‌ی الگوی قیمت این پرواز در {formatNumber(insight.stats.sampleSize)} روز. این یک
          برآورد است و تضمین قیمت آینده نیست.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3",
              buy ? "bg-brand-soft text-brand-ink" : "bg-warning-soft text-warning-ink",
            )}
          >
            <AdviceIcon className="size-7" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold">{ADVICE_LABELS[insight.advice]}</span>
              <span className="text-xs">
                قیمت {VERDICT_LABELS[insight.verdict]} · روند {TREND_LABELS[insight.trend]}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">اطمینان تحلیل</span>
              <span className="tnum font-semibold">{formatPercent(insight.confidence * 100)}</span>
            </div>
            <Progress value={insight.confidence * 100} aria-label="اطمینان تحلیل" />
            <p className="text-muted-foreground text-xs">
              ارزان‌تر از {formatPercent(insight.cheaperThanPercent)} روزهای بررسی‌شده ·{" "}
              {formatNumber(data.daysToDeparture)} روز تا پرواز
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2" role="list">
          {insight.reasons.map((reason) => {
            const Icon = REASON_ICON[reason.tone];
            return (
              <li key={reason.code} className="flex items-start gap-2 text-sm">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    reason.tone === "positive" && "text-primary",
                    reason.tone === "negative" && "text-warning-ink",
                    reason.tone === "neutral" && "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span>{reason.text}</span>
              </li>
            );
          })}
        </ul>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="ارزان‌ترین دیده‌شده" rial={insight.stats.min} />
          <Stat label="قیمت معمول" rial={insight.stats.median} />
          <Stat label="گران‌ترین دیده‌شده" rial={insight.stats.max} />
          <div className="bg-muted flex flex-col gap-1 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">یک هفته‌ی دیگر</dt>
            <dd className="flex flex-col">
              <Toman rial={insight.expectedPriceIn7Days} className="text-sm" />
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  insight.expectedChangePercent > 0 ? "text-warning-ink" : "text-brand-ink",
                )}
              >
                <ChangeIcon className="size-3" aria-hidden="true" />
                {formatPercent(Math.abs(insight.expectedChangePercent))}{" "}
                {insight.expectedChangePercent >= 0 ? "گران‌تر" : "ارزان‌تر"}
              </span>
            </dd>
          </div>
        </dl>

        <PriceChart
          history={data.history}
          forecast={data.forecast}
          median={insight.stats.median}
          target={insight.watchTarget}
        />

        {data.cheaperDates.length > 0 && (
          <section aria-label="روزهای ارزان‌تر" className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">روزهای نزدیک ارزان‌تر</h3>
            <ul className="flex flex-wrap gap-2" role="list">
              {data.cheaperDates.map((item) => (
                <li key={item.date}>
                  <Link
                    href={dateHref(item.date)}
                    className="hover:bg-muted focus-visible:ring-ring/50 flex flex-col rounded-lg border px-3 py-2 text-xs outline-none focus-visible:ring-3"
                  >
                    <span>{formatJalaliShort(item.date)}</span>
                    <span className="text-brand-ink tnum font-semibold">
                      {formatNumber(Math.round(item.savings / 10))} تومان ارزان‌تر
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Collapsible className="rounded-lg border" defaultOpen={!buy}>
          <CollapsibleTrigger className="focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-lg p-3 text-start text-sm font-medium outline-none focus-visible:ring-3">
            <BellIcon className="size-4" aria-hidden="true" />
            <span className="flex-1">قیمت ثابت نیست؟ هشدار قیمت بگذارید</span>
            {insight.watchTarget !== null && <Badge variant="secondary">هدف پیشنهادی</Badge>}
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-3">
            <PriceAlertForm
              origin={origin}
              destination={destination}
              date={date}
              cabin={cabin}
              currentPrice={data.currentPrice}
              suggested={insight.watchTarget}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function Stat({ label, rial }: { label: string; rial: number }) {
  return (
    <div className="bg-muted flex flex-col gap-1 rounded-lg p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>
        <Toman rial={rial} className="text-sm" />
      </dd>
    </div>
  );
}
