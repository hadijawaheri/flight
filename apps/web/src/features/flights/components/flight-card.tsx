"use client";

import type { FlightDto } from "@flysmart/contracts";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  PlaneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FlightCardProps {
  flight: FlightDto;
  onSelect: (flight: FlightDto) => void;
  isSelecting?: boolean;
}

export function FlightCard({ flight, onSelect, isSelecting }: FlightCardProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const depTime = new Date(flight.departureTime);
  const arrTime = new Date(flight.arrivalTime);

  const depHour = depTime.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  const arrHour = arrTime.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

  const durationHours = Math.floor(flight.durationMinutes / 60);
  const durationMins = flight.durationMinutes % 60;

  const isBuyNow = flight.pricePrediction.advice === "BUY_NOW";
  const isFalling = flight.pricePrediction.trend === "FALLING";
  const isRising = flight.pricePrediction.trend === "RISING";

  return (
    <Card className="hover:border-primary/40 overflow-hidden border transition-all hover:shadow-md">
      {/* Price Prediction Banner (Innovation) */}
      <div
        className={`flex items-center justify-between border-b px-4 py-1.5 text-xs font-medium ${
          isBuyNow
            ? "border-primary/20 bg-primary/10 text-primary dark:text-sky-300"
            : "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isFalling ? (
            <TrendingDownIcon className="text-primary size-4" />
          ) : isRising ? (
            <TrendingUpIcon className="size-4 text-amber-600" />
          ) : (
            <SparklesIcon className="text-primary size-4" />
          )}
          <span>
            {isBuyNow
              ? "پیشنهاد سیستم: هم‌اکنون بخرید (بهترین نرخ)"
              : "پیشنهاد سیستم: امکان کاهش نرخ در روزهای آتی"}
          </span>
        </div>
        <span className="hidden text-[11px] opacity-90 sm:inline">
          {flight.pricePrediction.reasoning}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Main Row */}
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
          {/* Airline & Aircraft (cols: 3) */}
          <div className="flex items-center gap-3 md:col-span-3">
            <div className="bg-muted text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold">
              <PlaneIcon className="size-5 rtl:rotate-180" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-foreground text-base font-bold">
                {flight.airline}
              </span>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span>{flight.flightNumber}</span>
                <span>•</span>
                <span>{flight.aircraft}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {flight.flightType === "CHARTER" ? "چارتری" : "سیستمی"}
                </Badge>
                {flight.flightClass === "BUSINESS" && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-700"
                  >
                    بیزینس
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Times & Timeline (cols: 5) */}
          <div className="flex items-center justify-between gap-3 px-2 md:col-span-5">
            {/* Origin */}
            <div className="flex flex-col items-start text-start">
              <span className="font-heading text-foreground text-xl font-bold">{depHour}</span>
              <span className="text-foreground text-xs font-semibold">{flight.origin}</span>
              <span className="text-muted-foreground text-[10px]">{flight.originAirport}</span>
            </div>

            {/* Duration Line */}
            <div className="flex flex-1 flex-col items-center gap-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
                <ClockIcon className="size-3" />
                {durationHours > 0 && `${durationHours} ساعت و `}
                {durationMins} دقیقه
              </span>
              <div className="relative flex w-full items-center">
                <div className="bg-border h-0.5 w-full" />
                <div className="bg-muted-foreground/40 absolute left-0 size-2 rounded-full" />
                <PlaneIcon className="text-primary absolute left-1/2 size-3.5 -translate-x-1/2 rtl:rotate-180" />
                <div className="bg-muted-foreground/40 absolute right-0 size-2 rounded-full" />
              </div>
              <span className="text-muted-foreground text-[10px]">مستقیم (بدون توقف)</span>
            </div>

            {/* Destination */}
            <div className="flex flex-col items-end text-end">
              <span className="font-heading text-foreground text-xl font-bold">{arrHour}</span>
              <span className="text-foreground text-xs font-semibold">{flight.destination}</span>
              <span className="text-muted-foreground text-[10px]">{flight.destinationAirport}</span>
            </div>
          </div>

          {/* Pricing & CTA (cols: 4) */}
          <div className="flex flex-row items-center justify-between gap-3 border-t pt-3 md:col-span-4 md:flex-col md:items-end md:border-s md:border-t-0 md:ps-5 md:pt-0">
            <div className="flex flex-col items-start md:items-end">
              {flight.basePrice > flight.finalPrice && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs line-through">
                    {flight.basePrice.toLocaleString("fa-IR")}
                  </span>
                  <Badge
                    variant="secondary"
                    className="border-amber-500/20 bg-amber-500/10 px-1.5 py-0 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                  >
                    تخفیف ویژه
                  </Badge>
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-primary text-xl font-bold sm:text-2xl">
                  {flight.finalPrice.toLocaleString("fa-IR")}
                </span>
                <span className="text-muted-foreground text-xs font-medium">ریال</span>
              </div>
              <span className="text-muted-foreground text-[10px]">هر مسافر بزرگسال</span>
            </div>

            <Button
              onClick={() => onSelect(flight)}
              disabled={isSelecting}
              className="shadow-primary/20 w-auto font-bold shadow-md md:w-full"
            >
              {isSelecting ? "در حال ثبت رزرو..." : "انتخاب پرواز"}
            </Button>
          </div>
        </div>

        {/* Quick Highlights & Toggle details */}
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <BriefcaseIcon className="size-3.5" />
              <span>بار مجاز: {flight.baggageAllowanceKg} کیلوگرم</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheckIcon className="text-primary size-3.5" />
              <span>
                {flight.isRefundable ? "قابل استرداد طبق قوانین" : "غیرقابل استرداد (چارتری)"}
              </span>
            </div>
            {flight.availableSeats <= 6 && (
              <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-600">
                تنها {flight.availableSeats} صندلی باقی‌مانده!
              </Badge>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-primary flex items-center gap-1 font-medium hover:underline"
          >
            <span>{showDetails ? "بستن جزئیات" : "قوانین و جزئیات پرواز"}</span>
            {showDetails ? (
              <ChevronUpIcon className="size-3.5" />
            ) : (
              <ChevronDownIcon className="size-3.5" />
            )}
          </button>
        </div>

        {/* Expandable Details Drawer */}
        {showDetails && (
          <div className="bg-muted/40 border-border/60 animate-in fade-in flex flex-col gap-3 rounded-xl border p-4 text-xs duration-150">
            <h5 className="font-heading text-foreground font-bold">
              قوانین کنسلی و جریمه استرداد:
            </h5>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {flight.refundRules.map((rule, idx) => (
                <div key={idx} className="bg-background flex flex-col gap-1 rounded-lg border p-2">
                  <span className="text-foreground font-bold">{rule.timeBeforeDeparture}</span>
                  <span className="text-muted-foreground">{rule.description}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-2">
              <span className="text-foreground font-semibold">خدمات پرواز:</span>
              {flight.features.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
