import { describe, expect, it } from "vitest";

import { addDaysIso } from "../common/dates";
import {
  analyzePrice,
  computePriceStats,
  type PricePoint,
  trendPercentPerDay,
} from "./price-insight";

function series(prices: number[], end = "2026-10-05"): PricePoint[] {
  return prices.map((price, index) => ({
    date: addDaysIso(end, index - (prices.length - 1)),
    price,
  }));
}

const flat = (value: number, n = 30): number[] => Array.from({ length: n }, () => value);
const ramp = (from: number, to: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => Math.round(from + ((to - from) * i) / (n - 1)));

describe("computePriceStats", () => {
  it("computes quantiles", () => {
    const stats = computePriceStats([10, 20, 30, 40, 50]);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(50);
    expect(stats.median).toBe(30);
    expect(stats.p25).toBe(20);
    expect(stats.p75).toBe(40);
    expect(stats.sampleSize).toBe(5);
  });

  it("handles an empty series", () => {
    expect(computePriceStats([]).median).toBe(0);
  });
});

describe("trendPercentPerDay", () => {
  it("is zero for a flat series and for too little data", () => {
    expect(trendPercentPerDay(flat(100))).toBeCloseTo(0, 5);
    expect(trendPercentPerDay([100, 110])).toBe(0);
  });

  it("detects steady growth and decline", () => {
    const up = Array.from({ length: 10 }, (_, i) => 100 * 1.02 ** i);
    const down = Array.from({ length: 10 }, (_, i) => 100 * 0.98 ** i);
    expect(trendPercentPerDay(up)).toBeCloseTo(2, 1);
    expect(trendPercentPerDay(down)).toBeCloseTo(-2, 1);
  });
});

describe("analyzePrice", () => {
  it("recommends buying a fare far below its history", () => {
    const history = series([...ramp(60_000_000, 62_000_000, 29), 45_000_000]);
    const insight = analyzePrice({ history, daysToDeparture: 20, seatsLeft: 40, capacity: 150 });
    expect(insight.verdict).toBe("VERY_LOW");
    expect(insight.cheaperThanPercent).toBeGreaterThanOrEqual(90);
    expect(insight.advice).toBe("BUY_NOW");
    expect(insight.savingsVsMedian).toBeGreaterThan(0);
    expect(insight.watchTarget).toBeNull();
  });

  it("advises waiting for an expensive, falling fare with plenty of time", () => {
    const history = series([...flat(50_000_000, 20), ...ramp(70_000_000, 64_000_000, 10)]);
    const insight = analyzePrice({ history, daysToDeparture: 40, seatsLeft: 80, capacity: 150 });
    expect(["HIGH", "VERY_HIGH"]).toContain(insight.verdict);
    expect(insight.trend).toBe("FALLING");
    expect(insight.advice).toBe("WAIT");
    expect(insight.watchTarget).not.toBeNull();
    expect((insight.watchTarget ?? 0) < 64_000_000).toBe(true);
  });

  it("always says buy close to departure", () => {
    const history = series([...flat(50_000_000, 20), ...ramp(70_000_000, 60_000_000, 10)]);
    for (const days of [0, 1, 2, 3]) {
      expect(
        analyzePrice({ history, daysToDeparture: days, seatsLeft: 100, capacity: 150 }).advice,
      ).toBe("BUY_NOW");
    }
  });

  it("never expects a drop inside the last two weeks", () => {
    const history = series(ramp(60_000_000, 50_000_000, 30));
    const insight = analyzePrice({ history, daysToDeparture: 10, seatsLeft: 60, capacity: 150 });
    expect(insight.expectedPriceIn7Days).toBeGreaterThanOrEqual(50_000_000);
    expect(insight.expectedChangePercent).toBeGreaterThanOrEqual(0);
  });

  it("uses the provider forecast when it is given", () => {
    const history = series(flat(50_000_000));
    const forecast = Array.from({ length: 7 }, (_, i) => ({
      date: addDaysIso("2026-10-06", i),
      price: 50_000_000 + i * 1_000_000,
    }));
    const insight = analyzePrice({
      history,
      forecast,
      daysToDeparture: 30,
      seatsLeft: 60,
      capacity: 150,
    });
    expect(insight.expectedPriceIn7Days).toBe(56_000_000);
  });

  it("counts scarce seats and peak dates in favour of buying", () => {
    const history = series(flat(50_000_000));
    const calm = analyzePrice({ history, daysToDeparture: 30, seatsLeft: 90, capacity: 150 });
    const scarce = analyzePrice({
      history,
      daysToDeparture: 30,
      seatsLeft: 3,
      capacity: 150,
      isPeakDate: true,
      demandReasons: ["اوج سفرهای نوروزی"],
    });
    expect(scarce.reasons.map((r) => r.code)).toContain("SCARCE_SEATS");
    expect(scarce.reasons.map((r) => r.code)).toContain("PEAK_DATE");
    expect(scarce.reasons.find((r) => r.code === "PEAK_DATE")?.text).toBe("اوج سفرهای نوروزی");
    expect(scarce.confidence).toBeGreaterThanOrEqual(calm.confidence);
  });

  it("lowers confidence with little history", () => {
    const rich = analyzePrice({
      history: series(ramp(50_000_000, 40_000_000, 60)),
      daysToDeparture: 20,
      seatsLeft: 3,
      capacity: 150,
    });
    const poor = analyzePrice({
      history: series([50_000_000, 48_000_000, 47_000_000]),
      daysToDeparture: 20,
      seatsLeft: 3,
      capacity: 150,
    });
    expect(poor.confidence).toBeLessThan(rich.confidence);
    expect(poor.confidence).toBeGreaterThanOrEqual(0.3);
    expect(rich.confidence).toBeLessThanOrEqual(0.95);
  });

  it("does not crash on a single point or an empty history", () => {
    expect(
      analyzePrice({
        history: series([50_000_000]),
        daysToDeparture: 10,
        seatsLeft: 10,
        capacity: 100,
      }).verdict,
    ).toBe("FAIR");
    expect(() =>
      analyzePrice({ history: [], daysToDeparture: 10, seatsLeft: 10, capacity: 100 }),
    ).not.toThrow();
  });

  it("keeps the reasons readable in Persian and typed by tone", () => {
    const insight = analyzePrice({
      history: series(ramp(50_000_000, 60_000_000, 30)),
      daysToDeparture: 5,
      seatsLeft: 4,
      capacity: 150,
    });
    expect(insight.reasons.length).toBeGreaterThan(0);
    for (const reason of insight.reasons) {
      expect(["positive", "negative", "neutral"]).toContain(reason.tone);
      expect(reason.text.length).toBeGreaterThan(5);
    }
  });
});
