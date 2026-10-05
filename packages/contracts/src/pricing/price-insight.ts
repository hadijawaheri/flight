import { roundRial } from "../common/money";

export const PRICE_TRENDS = ["FALLING", "RISING", "STABLE"] as const;
export type PriceTrend = (typeof PRICE_TRENDS)[number];

export const PRICE_ADVICES = ["BUY_NOW", "WAIT"] as const;
export type PriceAdvice = (typeof PRICE_ADVICES)[number];

export const PRICE_VERDICTS = ["VERY_LOW", "LOW", "FAIR", "HIGH", "VERY_HIGH"] as const;
export type PriceVerdict = (typeof PRICE_VERDICTS)[number];

export interface PricePoint {
  /** ISO date the price was observed (or predicted for). */
  date: string;
  price: number;
}

export interface InsightReason {
  code: string;
  tone: "positive" | "negative" | "neutral";
  text: string;
}

export interface PriceStats {
  min: number;
  max: number;
  median: number;
  mean: number;
  p25: number;
  p75: number;
  sampleSize: number;
}

export interface PriceInsight {
  verdict: PriceVerdict;
  /** Share (0–100) of observed days on which this flight was MORE expensive than today. */
  cheaperThanPercent: number;
  trend: PriceTrend;
  trendPercentPerDay: number;
  advice: PriceAdvice;
  /** 0.3 – 0.95; low when there is little history or prices are erratic. */
  confidence: number;
  expectedPriceIn7Days: number;
  expectedChangePercent: number;
  /** Positive when today's fare is below the typical (median) fare. */
  savingsVsMedian: number;
  /** Price at which an alert is worth setting when advice is WAIT. */
  watchTarget: number | null;
  stats: PriceStats;
  reasons: InsightReason[];
  dataSource: "simulation" | "observed";
}

export interface PriceInsightInput {
  /** Oldest first; the last point is today's price. */
  history: readonly PricePoint[];
  /** Predicted prices for the following days, nearest first (optional provider model). */
  forecast?: readonly PricePoint[];
  daysToDeparture: number;
  seatsLeft: number;
  capacity: number;
  isPeakDate?: boolean;
  demandReasons?: readonly string[];
  dataSource?: "simulation" | "observed";
}

const numberFormat = new Intl.NumberFormat("fa-IR");
const fa = (value: number): string => numberFormat.format(Math.round(value));

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = sorted[lower] as number;
  const high = sorted[upper] as number;
  return low + (high - low) * (position - lower);
}

export function computePriceStats(prices: readonly number[]): PriceStats {
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    median: quantile(sorted, 0.5),
    mean: sorted.length ? sum / sorted.length : 0,
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    sampleSize: sorted.length,
  };
}

/** Least-squares slope of ln(price) per day over the last `window` points, as percent per day. */
export function trendPercentPerDay(prices: readonly number[], window = 10): number {
  const points = prices.slice(-window).filter((price) => price > 0);
  if (points.length < 3) return 0;
  const n = points.length;
  const ys = points.map((price) => Math.log(price));
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((acc, y) => acc + y, 0) / n;
  let covariance = 0;
  let variance = 0;
  ys.forEach((y, x) => {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  });
  const slope = variance === 0 ? 0 : covariance / variance;
  return (Math.exp(slope) - 1) * 100;
}

function verdictFor(cheaperThanPercent: number): PriceVerdict {
  if (cheaperThanPercent >= 90) return "VERY_LOW";
  if (cheaperThanPercent >= 65) return "LOW";
  if (cheaperThanPercent >= 35) return "FAIR";
  if (cheaperThanPercent >= 10) return "HIGH";
  return "VERY_HIGH";
}

function deadlinePressure(daysToDeparture: number): number {
  if (daysToDeparture <= 3) return 1.15;
  if (daysToDeparture <= 7) return 1.1;
  if (daysToDeparture <= 14) return 1.05;
  if (daysToDeparture <= 21) return 1.02;
  return 1;
}

function expectedPriceAfter7Days(
  current: number,
  trendPerDay: number,
  daysToDeparture: number,
  forecast: readonly PricePoint[] | undefined,
  atLow: boolean,
): number {
  const horizon = Math.min(7, Math.max(1, daysToDeparture));
  const modelled = forecast?.[horizon - 1];
  if (modelled && modelled.price > 0) return modelled.price;

  let ratio = Math.min(1.4, Math.max(0.75, Math.pow(1 + trendPerDay / 100, 7)));
  // Fares almost never fall in the last two weeks before departure, and a fare already sitting at
  // the bottom of its range reverts upward rather than extending a one-off dip.
  if (daysToDeparture <= 14 || atLow) ratio = Math.max(ratio, 1);
  const pressure = ratio >= 1 ? deadlinePressure(daysToDeparture) : 1;
  return current * ratio * pressure;
}

export function analyzePrice(input: PriceInsightInput): PriceInsight {
  const prices = input.history.map((point) => point.price);
  const current = prices[prices.length - 1] ?? 0;
  const others = prices.slice(0, -1);
  const stats = computePriceStats(prices);

  // Ties count half so a perfectly flat history reads as "typical", not "the most expensive ever".
  const cheaperThanPercent =
    others.length < 3
      ? 50
      : Math.round(
          ((others.filter((price) => price > current).length +
            others.filter((price) => price === current).length / 2) /
            others.length) *
            100,
        );
  const verdict = verdictFor(cheaperThanPercent);

  const trendPerDay = trendPercentPerDay(prices);
  const trend: PriceTrend =
    trendPerDay > 0.6 ? "RISING" : trendPerDay < -0.6 ? "FALLING" : "STABLE";

  const atLow = verdict === "VERY_LOW" || verdict === "LOW";
  const expected = expectedPriceAfter7Days(
    current,
    trendPerDay,
    input.daysToDeparture,
    input.forecast,
    atLow,
  );
  const expectedChangePercent = current > 0 ? ((expected - current) / current) * 100 : 0;

  const seatShare = input.capacity > 0 ? input.seatsLeft / input.capacity : 1;
  const scarce = input.seatsLeft <= 5;
  const tightening = seatShare <= 0.2;

  let buyScore = 0;
  let waitScore = 0;
  const reasons: InsightReason[] = [];

  if (verdict === "VERY_LOW" || verdict === "LOW") {
    buyScore += 2;
    reasons.push({
      code: "BELOW_TYPICAL",
      tone: "positive",
      text: `ارزان‌تر از ${fa(cheaperThanPercent)}٪ روزهای بررسی‌شده برای این پرواز`,
    });
  } else if (verdict === "HIGH" || verdict === "VERY_HIGH") {
    waitScore += 2;
    reasons.push({
      code: "ABOVE_TYPICAL",
      tone: "negative",
      text: `گران‌تر از ${fa(100 - cheaperThanPercent)}٪ روزهای بررسی‌شده`,
    });
  } else {
    reasons.push({
      code: "NEAR_TYPICAL",
      tone: "neutral",
      text: "قیمت نزدیک به حالت معمول این پرواز است",
    });
  }

  if (expectedChangePercent > 8) {
    buyScore += 2;
    reasons.push({
      code: "EXPECTED_RISE",
      tone: "positive",
      text: `پیش‌بینی می‌شود تا یک هفته دیگر حدود ${fa(expectedChangePercent)}٪ گران شود`,
    });
  } else if (expectedChangePercent > 3) {
    buyScore += 1;
  } else if (expectedChangePercent < -3) {
    waitScore += 1;
    reasons.push({
      code: "EXPECTED_DROP",
      tone: "negative",
      text: `احتمال کاهش حدود ${fa(Math.abs(expectedChangePercent))}٪ تا یک هفته دیگر وجود دارد`,
    });
  }

  if (trend === "FALLING" && input.daysToDeparture > 7 && !atLow) {
    waitScore += 2;
    reasons.push({ code: "FALLING_TREND", tone: "negative", text: "روند اخیر قیمت نزولی است" });
  } else if (trend === "RISING") {
    buyScore += 1;
    reasons.push({ code: "RISING_TREND", tone: "positive", text: "روند اخیر قیمت صعودی است" });
  }

  if (input.daysToDeparture <= 7) {
    buyScore += 2;
    reasons.push({
      code: "NEAR_DEPARTURE",
      tone: "positive",
      text: `تا پرواز ${fa(Math.max(0, input.daysToDeparture))} روز مانده؛ نزدیک پرواز قیمت‌ها به‌ندرت پایین می‌آید`,
    });
  }

  if (scarce) {
    buyScore += 2;
    reasons.push({
      code: "SCARCE_SEATS",
      tone: "positive",
      text: `فقط ${fa(input.seatsLeft)} صندلی باقی مانده است`,
    });
  } else if (tightening) {
    buyScore += 1;
    reasons.push({ code: "FILLING_UP", tone: "positive", text: "ظرفیت پرواز رو به تکمیل است" });
  }

  if (input.isPeakDate) {
    buyScore += 1;
    reasons.push({
      code: "PEAK_DATE",
      tone: "positive",
      text: input.demandReasons?.[0] ?? "تاریخ پرتقاضا؛ قیمت‌ها معمولاً بالا می‌رود",
    });
  }

  const forceBuy = input.daysToDeparture <= 3;
  const advice: PriceAdvice = forceBuy || buyScore >= waitScore ? "BUY_NOW" : "WAIT";

  const volatility =
    stats.mean > 0
      ? Math.sqrt(
          prices.reduce((acc, price) => acc + (price - stats.mean) ** 2, 0) /
            Math.max(1, prices.length),
        ) / stats.mean
      : 0;
  const clarity = Math.min(1, Math.abs(buyScore - waitScore) / 6);
  let confidence = 0.4 + Math.min(0.25, prices.length / 120) + clarity * 0.25;
  if (volatility > 0.18) confidence -= 0.1;
  if (prices.length < 7) confidence -= 0.15;
  confidence = Math.min(0.95, Math.max(0.3, confidence));

  const watchCandidate = roundRial(stats.p25);
  const watchTarget = advice === "WAIT" && watchCandidate < current * 0.97 ? watchCandidate : null;

  return {
    verdict,
    cheaperThanPercent,
    trend,
    trendPercentPerDay: Math.round(trendPerDay * 100) / 100,
    advice,
    confidence: Math.round(confidence * 100) / 100,
    expectedPriceIn7Days: roundRial(expected),
    expectedChangePercent: Math.round(expectedChangePercent * 10) / 10,
    savingsVsMedian: Math.round(stats.median - current),
    watchTarget,
    stats: {
      ...stats,
      mean: Math.round(stats.mean),
      median: Math.round(stats.median),
      p25: Math.round(stats.p25),
      p75: Math.round(stats.p75),
    },
    reasons,
    dataSource: input.dataSource ?? "simulation",
  };
}
