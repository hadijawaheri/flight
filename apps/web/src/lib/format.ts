import {
  addDaysIso,
  isoToJalali,
  JALALI_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES,
  persianWeekday,
  tehranToday,
} from "@flysmart/contracts";

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeZone: "Asia/Tehran",
});
const longDateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tehran",
});

export const formatNumber = (value: number): string => numberFormat.format(value);

const yearFormat = new Intl.NumberFormat("fa-IR", { useGrouping: false });
export const formatYear = (year: number): string => yearFormat.format(year);

export const formatPercent = (value: number): string =>
  `${numberFormat.format(Math.round(value))}٪`;

// Money is stored as integer rial; people read toman
export const formatToman = (rial: number): string =>
  `${numberFormat.format(Math.round(rial / 10))} تومان`;

/** Price without the unit, for dense cards where the unit sits beside it in a smaller size. */
export const formatTomanNumber = (rial: number): string =>
  numberFormat.format(Math.round(rial / 10));

/** An ISO calendar date (`YYYY-MM-DD`) is a day, not an instant: format it as UTC to avoid drift. */
function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export const formatDate = (iso: string): string => dateFormat.format(isoToDate(iso));
export const formatLongDate = (iso: string): string => longDateFormat.format(isoToDate(iso));

export function formatJalaliShort(iso: string): string {
  const { year, month, day } = isoToJalali(iso);
  return `${numberFormat.format(day)} ${JALALI_MONTH_NAMES[month - 1]} ${formatYear(year)}`;
}

/** `2026-10-20T08:30` (airport wall clock) to `۰۸:۳۰`. */
export function formatClock(localTime: string): string {
  const [hours = "00", minutes = "00"] = localTime.slice(11, 16).split(":");
  return `${numberFormat.format(Number(hours)).padStart(2, "۰")}:${numberFormat.format(Number(minutes)).padStart(2, "۰")}`;
}

export function dateOfLocalTime(localTime: string): string {
  return localTime.slice(0, 10);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${numberFormat.format(rest)} دقیقه`;
  if (rest === 0) return `${numberFormat.format(hours)} ساعت`;
  return `${numberFormat.format(hours)} ساعت و ${numberFormat.format(rest)} دقیقه`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));
}

export { addDaysIso, tehranToday };

/** Persian relative label for a day: today, tomorrow, or the long date. */
export function relativeDayLabel(iso: string, today: string = tehranToday()): string {
  if (iso === today) return "امروز";
  if (iso === addDaysIso(today, 1)) return "فردا";
  return formatLongDate(iso);
}

/** Day of the Jalali month, e.g. `۲۸`, for dense calendar tiles. */
export const formatJalaliDay = (iso: string): string => numberFormat.format(isoToJalali(iso).day);

export function formatJalaliMonth(iso: string): string {
  return JALALI_MONTH_NAMES[isoToJalali(iso).month - 1] ?? "";
}

/** Weekday name, Saturday-first like the Persian week. */
export const formatWeekday = (iso: string): string =>
  PERSIAN_WEEKDAY_NAMES[persianWeekday(iso)] ?? "";

/** `۳٫۵ م` for chart axes, where a full amount would not fit. */
export function formatTomanCompact(rial: number): string {
  const toman = rial / 10;
  if (toman >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(toman / 1_000_000)} م`;
  }
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(toman / 1000)} هزار`;
}
