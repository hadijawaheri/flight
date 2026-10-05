/**
 * Jalali (Persian) calendar conversion. Algorithm after jalaali-js (MIT), valid for Jalali
 * years -61..3177. Written in-house because the calendar picker must not depend on a 3rd party.
 */

export interface JalaliDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
}

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const PERSIAN_WEEKDAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export const PERSIAN_WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
] as const;

const div = (a: number, b: number): number => Math.trunc(a / b);
const mod = (a: number, b: number): number => a - Math.trunc(a / b) * b;

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number): JalCal {
  const gy = jy + 621;
  let leapJ = -14;
  let jp: number = BREAKS[0];
  let jump = 0;
  const last = BREAKS[BREAKS.length - 1] as number;
  if (jy < jp || jy >= last) throw new RangeError(`Invalid Jalali year ${jy}`);

  for (let index = 1; index < BREAKS.length; index += 1) {
    const jm = BREAKS[index] as number;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function gregorianToJdn(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function jdnToGregorian(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalaliToJdn(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return gregorianToJdn(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function jdnToJalali(jdn: number): JalaliDate {
  const gy = jdnToGregorian(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = gregorianToJdn(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { year: jy, month: 1 + div(k, 31), day: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { year: jy, month: 7 + div(k, 30), day: mod(k, 30) + 1 };
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return jdnToJalali(gregorianToJdn(gy, gm, gd));
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const { gy, gm, gd } = jdnToGregorian(jalaliToJdn(jy, jm, jd));
  return [gy, gm, gd];
}

export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function isoToJalali(iso: string): JalaliDate {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  return gregorianToJalali(year, month, day);
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${String(gy).padStart(4, "0")}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/** Weekday index of the 1st of a Jalali month, 0 = Saturday. Used to lay out the calendar grid. */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const sundayBased = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();
  return (sundayBased + 1) % 7;
}

export interface JalaliMonthCell {
  iso: string;
  day: number;
}

/** Returns the days of a Jalali month with the Gregorian ISO date of each one. */
export function jalaliMonthDays(jy: number, jm: number): JalaliMonthCell[] {
  return Array.from({ length: jalaliMonthLength(jy, jm) }, (_, index) => ({
    day: index + 1,
    iso: jalaliToIso(jy, jm, index + 1),
  }));
}

export function addJalaliMonths(
  jy: number,
  jm: number,
  delta: number,
): { year: number; month: number } {
  const zeroBased = jy * 12 + (jm - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: mod(zeroBased, 12) + 1 };
}
