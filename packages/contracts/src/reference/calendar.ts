import { addDaysIso, persianWeekday } from "../common/dates";
import { isoToJalali } from "../common/jalali";

/**
 * Demand calendar for the simulated fare model. Only solar-calendar events are modelled; lunar
 * holidays move every year and must come from a data feed when a real provider is plugged in.
 */

const FIXED_HOLIDAYS: ReadonlyArray<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "نوروز" },
  { month: 1, day: 2, name: "نوروز" },
  { month: 1, day: 3, name: "نوروز" },
  { month: 1, day: 4, name: "نوروز" },
  { month: 1, day: 12, name: "روز جمهوری اسلامی" },
  { month: 1, day: 13, name: "سیزده‌بدر" },
  { month: 3, day: 14, name: "رحلت امام خمینی" },
  { month: 3, day: 15, name: "قیام ۱۵ خرداد" },
  { month: 11, day: 22, name: "پیروزی انقلاب اسلامی" },
  { month: 12, day: 29, name: "ملی شدن صنعت نفت" },
];

export function officialHolidayName(iso: string): string | null {
  const { month, day } = isoToJalali(iso);
  return (
    FIXED_HOLIDAYS.find((holiday) => holiday.month === month && holiday.day === day)?.name ?? null
  );
}

export interface DemandInfo {
  /** Multiplier applied to the base fare for this travel date (≈ 0.9 – 1.5). */
  multiplier: number;
  isPeak: boolean;
  /** Persian labels explaining the multiplier, shown in the price insight. */
  reasons: string[];
}

const WEEKDAY_MULTIPLIER = [1.04, 0.98, 0.95, 0.93, 0.96, 1.1, 1.06] as const; // Sat … Fri

export function demandForDate(iso: string): DemandInfo {
  const { month, day } = isoToJalali(iso);
  const reasons: string[] = [];
  let multiplier = WEEKDAY_MULTIPLIER[persianWeekday(iso)] ?? 1;
  const weekday = persianWeekday(iso);
  if (weekday === 5 || weekday === 6) reasons.push("آخر هفته؛ تقاضای بیشتر");

  const inNowruz = (month === 12 && day >= 20) || (month === 1 && day <= 13);
  const nowruzCore = (month === 12 && day >= 25) || (month === 1 && day <= 4);
  if (nowruzCore) {
    multiplier *= 1.45;
    reasons.push("اوج سفرهای نوروزی");
  } else if (inNowruz) {
    multiplier *= 1.25;
    reasons.push("ایام نوروز");
  } else if (month >= 4 && month <= 6) {
    multiplier *= 1.12;
    reasons.push("فصل تابستان و سفرهای تعطیلات");
  } else if (month === 10 || month === 11) {
    multiplier *= 0.93;
    reasons.push("فصل کم‌تقاضا (دی و بهمن)");
  } else if (month === 9) {
    multiplier *= 0.97;
  }

  const holiday = officialHolidayName(iso);
  const tomorrowHoliday = officialHolidayName(addDaysIso(iso, 1));
  if (holiday && !inNowruz) {
    multiplier *= 1.1;
    reasons.push(`تعطیلی رسمی (${holiday})`);
  } else if (tomorrowHoliday && !inNowruz) {
    multiplier *= 1.12;
    reasons.push("شب تعطیلی رسمی");
  }

  return { multiplier, isPeak: multiplier >= 1.2, reasons };
}
