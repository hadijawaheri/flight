import { describe, expect, it } from "vitest";

import {
  addDays,
  daysDiff,
  formatDate,
  formatFullDate,
  formatNumber,
  formatToman,
  normalizeDateParam,
  toAsciiDigits,
} from "./format";

describe("format", () => {
  it("formats numbers with persian digits and separators", () => {
    expect(formatNumber(1234567)).toBe("۱٬۲۳۴٬۵۶۷");
  });

  it("converts rial to toman", () => {
    expect(formatToman(125000)).toBe("۱۲٬۵۰۰ تومان");
  });

  it("converts persian digits to ascii", () => {
    expect(toAsciiDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(toAsciiDigits("۱۸:۳۰")).toBe("18:30");
  });

  it("formats dates in the persian calendar", () => {
    // 2026-03-21T12:00Z is Nowruz 1405
    expect(formatDate("2026-03-21T12:00:00Z")).toContain("۱۴۰۵");
  });

  it("formats full dates safely without throwing for natural or invalid dates", () => {
    expect(formatFullDate("2026-10-04")).toBeTruthy();
    expect(formatFullDate("فردا ۱۸:۳۰")).toBeTruthy();
    expect(formatFullDate("invalid-date")).toBeTruthy();
    expect(formatFullDate(new Date())).toBeTruthy();
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

  describe("normalizeDateParam", () => {
    const todayStr = new Date().toISOString().split("T")[0]!;

    it("preserves valid YYYY-MM-DD strings", () => {
      expect(normalizeDateParam("2026-10-15")).toBe("2026-10-15");
      expect(normalizeDateParam("2027-01-01")).toBe("2027-01-01");
    });

    it("extracts ISO dates with timestamps or whitespace", () => {
      expect(normalizeDateParam("2026-10-15T18:30:00.000Z")).toBe("2026-10-15");
      expect(normalizeDateParam("2026-10-15 18:30")).toBe("2026-10-15");
    });

    it("resolves natural Persian relative dates like 'فردا ۱۸:۳۰'", () => {
      const tomorrow = addDays(todayStr, 1);
      expect(normalizeDateParam("فردا ۱۸:۳۰")).toBe(tomorrow);
      expect(normalizeDateParam("فردا")).toBe(tomorrow);
      // URL-encoded 'فردا ۱۸:۳۰'
      expect(normalizeDateParam("%D9%81%D8%B1%D8%AF%D8%A7%20%DB%B1%DB%B8:%DB%B3%DB%B0")).toBe(
        tomorrow,
      );
    });

    it("resolves 'پس‌فردا', '۳ روز آینده', 'آخر هفته', and 'امروز'", () => {
      const dayAfterTomorrow = addDays(todayStr, 2);
      expect(normalizeDateParam("پس‌فردا ۰۸:۱۵")).toBe(dayAfterTomorrow);
      expect(normalizeDateParam("پس فردا")).toBe(dayAfterTomorrow);

      const threeDaysAhead = addDays(todayStr, 3);
      expect(normalizeDateParam("۳ روز آینده ۱۲:۰۰")).toBe(threeDaysAhead);
      expect(normalizeDateParam("آخر هفته ۱۰:۴۵")).toBe(threeDaysAhead);

      const fourDaysAhead = addDays(todayStr, 4);
      expect(normalizeDateParam("۴ روز آینده ۱۹:۱۰")).toBe(fourDaysAhead);

      expect(normalizeDateParam("امروز")).toBe(todayStr);
    });

    it("handles null, undefined, empty, or malformed inputs safely", () => {
      expect(normalizeDateParam(null)).toBe(todayStr);
      expect(normalizeDateParam(undefined)).toBe(todayStr);
      expect(normalizeDateParam("")).toBe(todayStr);
      expect(normalizeDateParam("   ")).toBe(todayStr);
      expect(normalizeDateParam("invalid-date-string-xyz")).toBe(todayStr);
    });

    it("converts Persian digits in ISO dates", () => {
      expect(normalizeDateParam("۲۰۲۶-۱۰-۱۵")).toBe("2026-10-15");
    });
  });

  describe("addDays and daysDiff safety against invalid inputs", () => {
    it("never throws for Persian natural phrases or invalid strings in addDays", () => {
      expect(() => addDays("فردا ۱۸:۳۰", -3)).not.toThrow();
      const todayStr = new Date().toISOString().split("T")[0]!;
      const tomorrowStr = addDays(todayStr, 1);
      const expectedTwoDaysAgo = addDays(tomorrowStr, -3);
      expect(addDays("فردا ۱۸:۳۰", -3)).toBe(expectedTwoDaysAgo);
    });

    it("never returns NaN for daysDiff with Persian phrases", () => {
      const todayStr = new Date().toISOString().split("T")[0]!;
      const diff = daysDiff("فردا ۱۸:۳۰", todayStr);
      expect(diff).toBe(1);
      expect(isNaN(diff)).toBe(false);
    });
  });
});
