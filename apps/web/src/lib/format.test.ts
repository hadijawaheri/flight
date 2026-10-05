import { describe, expect, it } from "vitest";

import {
  dateOfLocalTime,
  formatClock,
  formatDuration,
  formatJalaliDay,
  formatJalaliShort,
  formatTomanCompact,
  formatTomanNumber,
  formatWeekday,
  relativeDayLabel,
} from "./format";

describe("format", () => {
  it("shows prices in toman, not rial", () => {
    expect(formatTomanNumber(35_000_000)).toBe("۳٬۵۰۰٬۰۰۰");
  });

  it("compacts axis labels", () => {
    expect(formatTomanCompact(35_000_000)).toBe("۳٫۵ م");
    expect(formatTomanCompact(5_000_000)).toBe("۵۰۰ هزار");
  });

  it("reads the airport wall clock without timezone drift", () => {
    expect(formatClock("2026-10-20T08:05")).toBe("۰۸:۰۵");
    expect(dateOfLocalTime("2026-10-20T08:05")).toBe("2026-10-20");
  });

  it("formats durations", () => {
    expect(formatDuration(90)).toBe("۱ ساعت و ۳۰ دقیقه");
    expect(formatDuration(120)).toBe("۲ ساعت");
    expect(formatDuration(45)).toBe("۴۵ دقیقه");
  });

  it("converts ISO dates to Jalali", () => {
    // 2026-03-21 is 1 Farvardin 1405.
    expect(formatJalaliShort("2026-03-21")).toBe("۱ فروردین ۱۴۰۵");
    expect(formatJalaliDay("2026-03-21")).toBe("۱");
  });

  it("starts the Persian week on Saturday", () => {
    expect(formatWeekday("2026-10-03")).toBe("شنبه");
    expect(formatWeekday("2026-10-09")).toBe("جمعه");
  });

  it("labels today and tomorrow", () => {
    expect(relativeDayLabel("2026-10-05", "2026-10-05")).toBe("امروز");
    expect(relativeDayLabel("2026-10-06", "2026-10-05")).toBe("فردا");
  });
});
