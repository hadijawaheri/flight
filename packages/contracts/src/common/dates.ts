import { z } from "zod";

import { normalizeDigits } from "./digits";

/** Iran has no DST since 2022, so a fixed offset is correct for scheduling and "today". */
export const TEHRAN_UTC_OFFSET_MINUTES = 210;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const isoDateSchema = z
  .string()
  .transform(normalizeDigits)
  .refine(isValidIsoDate, "تاریخ معتبر نیست (قالب YYYY-MM-DD)");

function parseIso(value: string): number {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The calendar date in Tehran at the given instant (not the UTC date). */
export function tehranToday(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getTime() + TEHRAN_UTC_OFFSET_MINUTES * 60_000));
}

export function addDaysIso(iso: string, days: number): string {
  return toIsoDate(new Date(parseIso(iso) + days * DAY_MS));
}

/** Whole days from `b` to `a` (a - b). */
export function diffDaysIso(a: string, b: string): number {
  return Math.round((parseIso(a) - parseIso(b)) / DAY_MS);
}

/** 0 = Saturday … 6 = Friday, the Iranian week. */
export function persianWeekday(iso: string): number {
  const sundayBased = new Date(parseIso(iso)).getUTCDay();
  return (sundayBased + 1) % 7;
}

export function isFriday(iso: string): boolean {
  return persianWeekday(iso) === 6;
}

export function isoDateRange(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDaysIso(start, index));
}

/** Builds a UTC instant from a local wall-clock date/time at a fixed UTC offset. */
export function localToUtc(
  isoDate: string,
  minutesFromMidnight: number,
  utcOffsetMinutes: number,
): Date {
  return new Date(parseIso(isoDate) + (minutesFromMidnight - utcOffsetMinutes) * 60_000);
}

/** Formats the wall clock of an instant at a UTC offset as `YYYY-MM-DDTHH:mm`. */
export function utcToLocalString(instant: Date, utcOffsetMinutes: number): string {
  return new Date(instant.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 16);
}

export function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 3_600_000;
}
