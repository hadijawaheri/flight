import type {
  AssistantCardDto,
  PriceInsight,
  PriceVerdict,
  RefundQuoteDto,
  RefundResult,
} from "@flysmart/contracts";
import {
  type BatteryVerdict,
  calculateExcessBaggage,
  calculateRefund,
  evaluateBattery,
  EXCESS_BAGGAGE_RATE_PERCENT,
  type FareFamily,
  type FlightType,
  formatToman,
  refundPolicyFor,
  type RefundReason,
  tomanToRial,
  wattHoursFromMah,
} from "@flysmart/contracts";

/** Pure calculators behind the assistant's tools. Each returns a card the UI renders as-is. */

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const fa = (value: number): string => faNumber.format(value);

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  VERY_LOW: "بسیار ارزان",
  LOW: "ارزان",
  FAIR: "معمولی",
  HIGH: "گران",
  VERY_HIGH: "بسیار گران",
};

const TREND_LABELS = { FALLING: "نزولی", RISING: "صعودی", STABLE: "ثابت" } as const;

export interface BatteryArgs {
  wattHours?: number;
  milliampHours?: number;
  volts?: number;
  spare: boolean;
}

const BATTERY_TONE: Record<BatteryVerdict, AssistantCardDto["tone"]> = {
  ALLOWED: "ok",
  NEEDS_APPROVAL: "warn",
  FORBIDDEN: "danger",
};
const BATTERY_TITLE: Record<BatteryVerdict, string> = {
  ALLOWED: "حمل مجاز است",
  NEEDS_APPROVAL: "نیازمند تأیید ایرلاین",
  FORBIDDEN: "حمل ممنوع است",
};

export function batteryCard(args: BatteryArgs): AssistantCardDto | null {
  const wattHours =
    args.wattHours ??
    (args.milliampHours ? wattHoursFromMah(args.milliampHours, args.volts) : undefined);
  if (wattHours === undefined || !Number.isFinite(wattHours) || wattHours <= 0) return null;

  const result = evaluateBattery({ wattHours, spare: args.spare });
  return {
    tool: "evaluate_battery",
    title: BATTERY_TITLE[result.verdict],
    tone: BATTERY_TONE[result.verdict],
    rows: [
      { label: "ظرفیت", value: `${fa(Math.round(wattHours * 10) / 10)} وات‌ساعت` },
      { label: "نوع", value: args.spare ? "باتری یدکی / پاوربانک" : "نصب‌شده روی دستگاه" },
      {
        label: "محل حمل",
        value: result.location === "CABIN_ONLY" ? "فقط بار دستی (کابین)" : "کابین یا بار تحویلی",
      },
      ...(result.maxPerPassenger !== null && result.maxPerPassenger > 0
        ? [{ label: "حداکثر برای هر مسافر", value: `${fa(result.maxPerPassenger)} عدد` }]
        : []),
    ],
    note: result.message,
    href: null,
  };
}

export interface ExcessBaggageArgs {
  baggageKg: number;
  allowanceKg: number;
  /** Full-price adult economy fare of the route, rial. */
  fullEconomyFare: number;
  ratePercentPerKg?: number;
}

export function excessBaggageCard(args: ExcessBaggageArgs): AssistantCardDto {
  const result = calculateExcessBaggage(args);
  const rate = args.ratePercentPerKg ?? EXCESS_BAGGAGE_RATE_PERCENT;
  return {
    tool: "excess_baggage",
    title: result.excessKg === 0 ? "بار شما در سهمیه است" : "برآورد هزینه‌ی اضافه بار",
    tone: result.excessKg === 0 ? "ok" : "warn",
    rows: [
      { label: "وزن بار", value: `${fa(args.baggageKg)} کیلوگرم` },
      { label: "سهمیه", value: `${fa(args.allowanceKg)} کیلوگرم` },
      { label: "اضافه", value: `${fa(result.excessKg)} کیلوگرم` },
      ...(result.excessKg > 0
        ? [
            { label: `هر کیلو (${fa(rate)}٪ کرایه‌ی کامل)`, value: formatToman(result.feePerKg) },
            { label: "جمع", value: formatToman(result.totalFee) },
          ]
        : []),
    ],
    note: "این یک برآورد با نرخ رایج صنعت است؛ نرخ قطعی را ایرلاین اعلام می‌کند.",
    href: null,
  };
}

export interface GenericRefundArgs {
  baseFareToman: number;
  hoursBeforeDeparture: number;
  family: FareFamily;
  flightType: FlightType;
  reason: RefundReason;
}

function refundRows(result: RefundResult, base: number): Array<{ label: string; value: string }> {
  return [
    { label: "بازه‌ی زمانی", value: result.tierLabel },
    {
      label: "جریمه",
      value: `${fa(result.penaltyPercent)}٪ (${formatToman(result.penaltyAmount)})`,
    },
    { label: "مبلغ پایه", value: formatToman(base) },
    { label: "برآورد مبلغ برگشتی", value: formatToman(result.refundAmount) },
  ];
}

/** Refund estimate for a hypothetical ticket; taxes and fees are unknown so only the base fare is used. */
export function genericRefundCard(args: GenericRefundArgs): AssistantCardDto {
  const policy = refundPolicyFor(args.flightType, args.family);
  const base = tomanToRial(args.baseFareToman);
  const result = calculateRefund({
    baseFare: base,
    taxes: 0,
    serviceFee: 0,
    policy,
    hoursBeforeDeparture: args.hoursBeforeDeparture,
    reason: args.reason,
  });
  return {
    tool: "refund_estimate",
    title:
      result.penaltyPercent === 0 ? "استرداد بدون جریمه" : `جریمه‌ی ${fa(result.penaltyPercent)}٪`,
    tone: result.penaltyPercent === 0 ? "ok" : result.penaltyPercent >= 50 ? "danger" : "warn",
    rows: refundRows(result, base),
    note: "برآورد روی کرایه‌ی پایه و با جدول نمونه‌ی این سامانه است؛ مالیات و کارمزد در آن لحاظ نشده و جدول ایرلاین واقعی ممکن است فرق کند.",
    href: null,
  };
}

/** Refund estimate for a real booking, straight from the same quote the cancel button uses. */
export function bookingRefundCard(quote: RefundQuoteDto): AssistantCardDto {
  if (!quote.cancellable) {
    return {
      tool: "refund_estimate",
      title: "این رزرو قابل لغو نیست",
      tone: "danger",
      rows: [],
      note: quote.blockedReason,
      href: `/dashboard/bookings/${quote.bookingId}`,
    };
  }
  return {
    tool: "refund_estimate",
    title: quote.totalPenalty === 0 ? "لغو بدون جریمه" : "برآورد استرداد این رزرو",
    tone: quote.totalPenalty === 0 ? "ok" : "warn",
    rows: [
      ...quote.slices.map((slice) => ({
        label: slice.direction === "OUTBOUND" ? "پرواز رفت" : "پرواز برگشت",
        value: `${slice.result.tierLabel}؛ جریمه ${fa(slice.result.penaltyPercent)}٪`,
      })),
      { label: "جریمه", value: formatToman(quote.totalPenalty) },
      { label: "کارمزدهای بازگشت‌ناپذیر", value: formatToman(quote.totalNonRefundableFees) },
      { label: "مبلغ برگشتی", value: formatToman(quote.totalRefund) },
    ],
    note: "این همان مبلغی است که با لغو در همین لحظه محاسبه می‌شود و با گذشت زمان ممکن است کم شود.",
    href: `/dashboard/bookings/${quote.bookingId}`,
  };
}

export function priceAdviceCard(
  insight: PriceInsight,
  flightLabel: string,
  href: string,
): AssistantCardDto {
  const buy = insight.advice === "BUY_NOW";
  return {
    tool: "price_advice",
    title: buy ? "پیشنهاد: همین حالا بخرید" : "پیشنهاد: کمی صبر کنید",
    tone: buy ? "ok" : "warn",
    rows: [
      { label: "پرواز", value: flightLabel },
      {
        label: "وضعیت قیمت",
        value: `${VERDICT_LABELS[insight.verdict]} (ارزان‌تر از ${fa(insight.cheaperThanPercent)}٪ روزها)`,
      },
      { label: "روند", value: TREND_LABELS[insight.trend] },
      {
        label: "پیش‌بینی هفته‌ی آینده",
        value: `${formatToman(insight.expectedPriceIn7Days)} (${insight.expectedChangePercent > 0 ? "+" : ""}${fa(insight.expectedChangePercent)}٪)`,
      },
      { label: "اطمینان", value: `${fa(Math.round(insight.confidence * 100))}٪` },
      ...(insight.watchTarget !== null
        ? [{ label: "قیمت پیشنهادی هشدار", value: formatToman(insight.watchTarget) }]
        : []),
    ],
    note: insight.reasons[0]?.text ?? null,
    href,
  };
}

export interface CheapestFlightRow {
  label: string;
  pricePerAdult: number;
  href: string;
}

export function cheapestFlightsCard(
  routeLabel: string,
  date: string,
  rows: readonly CheapestFlightRow[],
): AssistantCardDto {
  const best = rows[0];
  return {
    tool: "cheapest_flights",
    title: rows.length === 0 ? "پروازی پیدا نشد" : `ارزان‌ترین پروازهای ${routeLabel}`,
    tone: rows.length === 0 ? "info" : "ok",
    rows: rows.map((row) => ({ label: row.label, value: formatToman(row.pricePerAdult) })),
    note:
      rows.length === 0
        ? `برای ${date} پرواز قابل رزروی پیدا نشد؛ تاریخ دیگری را بررسی کنید.`
        : "قیمت برای یک بزرگسال و شامل مالیات است.",
    href: best ? best.href : null,
  };
}
