import { describe, expect, it } from "vitest";

import { addDaysIso, diffDaysIso, isValidIsoDate, persianWeekday, tehranToday } from "./dates";
import {
  addJalaliMonths,
  gregorianToJalali,
  isJalaliLeapYear,
  isoToJalali,
  jalaliMonthDays,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  jalaliToGregorian,
  jalaliToIso,
} from "./jalali";

describe("jalali conversion", () => {
  it.each([
    ["2026-10-05", 1405, 7, 13],
    ["2025-03-21", 1404, 1, 1],
    ["2026-03-21", 1405, 1, 1],
    ["2026-03-20", 1404, 12, 29],
    ["2024-03-20", 1403, 1, 1],
    ["2000-01-01", 1378, 10, 11],
  ])("%s -> %d/%d/%d", (iso, jy, jm, jd) => {
    expect(isoToJalali(iso)).toEqual({ year: jy, month: jm, day: jd });
    expect(jalaliToIso(jy, jm, jd)).toBe(iso);
  });

  it("matches Intl persian calendar for every day in 1395..1415 and round-trips", () => {
    const formatter = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
    let iso = "2016-03-20";
    for (let i = 0; i < 365 * 21; i += 1) {
      const parts = formatter.formatToParts(new Date(`${iso}T12:00:00Z`));
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
      const jalali = isoToJalali(iso);
      expect([jalali.year, jalali.month, jalali.day]).toEqual([
        get("year"),
        get("month"),
        get("day"),
      ]);
      expect(jalaliToIso(jalali.year, jalali.month, jalali.day)).toBe(iso);
      iso = addDaysIso(iso, 1);
    }
  });

  it("knows leap years and month lengths", () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
    expect(jalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliMonthLength(1405, 6)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
  });

  it("lays out a month", () => {
    const days = jalaliMonthDays(1405, 7);
    expect(days).toHaveLength(30);
    expect(days[0]?.iso).toBe("2026-09-23");
    expect(days[29]?.iso).toBe("2026-10-22");
    // 23 Sep 2026 is a Wednesday -> Persian weekday index 4 (چهارشنبه)
    expect(jalaliMonthStartWeekday(1405, 7)).toBe(4);
  });

  it("moves across year boundaries", () => {
    expect(addJalaliMonths(1405, 12, 1)).toEqual({ year: 1406, month: 1 });
    expect(addJalaliMonths(1405, 1, -1)).toEqual({ year: 1404, month: 12 });
    expect(addJalaliMonths(1405, 7, 18)).toEqual({ year: 1407, month: 1 });
  });

  it("converts gregorian triples", () => {
    expect(gregorianToJalali(2026, 10, 5)).toEqual({ year: 1405, month: 7, day: 13 });
    expect(jalaliToGregorian(1405, 7, 13)).toEqual([2026, 10, 5]);
  });
});

describe("iso dates", () => {
  it("validates real calendar dates", () => {
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("15-10-2026")).toBe(false);
  });

  it("adds and diffs days across month boundaries", () => {
    expect(addDaysIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDaysIso("2026-10-15", "2026-10-05")).toBe(10);
  });

  it("uses the Iranian week", () => {
    expect(persianWeekday("2026-10-03")).toBe(0); // Saturday
    expect(persianWeekday("2026-10-09")).toBe(6); // Friday
  });

  it("derives Tehran's date, not UTC's", () => {
    expect(tehranToday(new Date("2026-10-05T21:00:00Z"))).toBe("2026-10-06");
    expect(tehranToday(new Date("2026-10-05T10:00:00Z"))).toBe("2026-10-05");
  });
});
