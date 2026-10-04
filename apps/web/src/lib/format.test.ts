import { describe, expect, it } from "vitest";

import { addDays, daysDiff, formatDate, formatNumber, formatToman } from "./format";

describe("format", () => {
  it("formats numbers with persian digits and separators", () => {
    expect(formatNumber(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
  });

  it("converts rial to toman", () => {
    expect(formatToman(125000)).toBe("۱۲٬۵۰۰ تومان");
  });

  it("formats dates in the persian calendar", () => {
    // 2026-03-21T12:00Z is Nowruz 1405
    expect(formatDate("2026-03-21T12:00:00Z")).toContain("۱۴۰۵");
  });

  it("adds and subtracts days safely without timezone drift", () => {
    expect(addDays("2026-10-04", 1)).toBe("2026-10-05");
    expect(addDays("2026-10-04", -1)).toBe("2026-10-03");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("calculates difference in days correctly", () => {
    expect(daysDiff("2026-10-10", "2026-10-04")).toBe(6);
    expect(daysDiff("2026-10-04", "2026-10-10")).toBe(-6);
    expect(daysDiff("2026-10-04", "2026-10-04")).toBe(0);
  });
});
