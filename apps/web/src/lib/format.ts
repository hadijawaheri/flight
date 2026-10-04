const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeZone: "Asia/Tehran",
});
const fullDateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "full",
  timeZone: "Asia/Tehran",
});

export const formatNumber = (value: number): string => numberFormat.format(value);

// Money is stored as integer rial; the UI shows toman
export const formatToman = (rial: number): string =>
  `${numberFormat.format(Math.round(rial / 10))} تومان`;

/**
 * Converts Persian and Arabic digits to standard ASCII digits.
 */
export function toAsciiDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
}

/**
 * Normalizes any date input (ISO YYYY-MM-DD, Persian natural phrase like 'فردا ۱۸:۳۰',
 * URL-encoded text, or Jalali text) into a guaranteed valid YYYY-MM-DD string.
 * Never throws an exception.
 */
export function normalizeDateParam(rawDate: string | null | undefined): string {
  const getTodayUtcStr = (): string => new Date().toISOString().split("T")[0]!;

  if (!rawDate || typeof rawDate !== "string") {
    return getTodayUtcStr();
  }

  let decoded = rawDate;
  try {
    decoded = decodeURIComponent(rawDate);
  } catch {
    // Keep decoded as-is if malformed percent-encoding
  }

  const cleaned = toAsciiDigits(decoded).trim().toLowerCase();
  if (!cleaned) {
    return getTodayUtcStr();
  }

  // Exact YYYY-MM-DD match
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const testDate = new Date(`${cleaned}T00:00:00Z`);
    if (!isNaN(testDate.getTime())) {
      return cleaned;
    }
  }

  // ISO string prefix (e.g. 2026-10-05T18:30:00 or 2026-10-05 18:30)
  const isoPrefix = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix && isoPrefix[1]) {
    const testDate = new Date(`${isoPrefix[1]}T00:00:00Z`);
    if (!isNaN(testDate.getTime())) {
      return isoPrefix[1];
    }
  }

  const todayStr = getTodayUtcStr();
  const [ty, tm, td] = todayStr.split("-").map(Number);

  const addDaysHelper = (baseY: number, baseM: number, baseD: number, days: number): string => {
    const d = new Date(Date.UTC(baseY, baseM - 1, baseD + days));
    return d.toISOString().split("T")[0]!;
  };

  // Persian relative phrases
  // Check for 'پس‌فردا' (with or without ZWNJ or space or hyphen)
  if (cleaned.includes("پس فردا") || cleaned.includes("پس‌فردا") || cleaned.includes("پسفردا")) {
    return addDaysHelper(ty!, tm!, td!, 2);
  }

  // Check for 'فردا'
  if (cleaned.includes("فردا")) {
    return addDaysHelper(ty!, tm!, td!, 1);
  }

  // Check for 'امروز'
  if (cleaned.includes("امروز")) {
    return todayStr;
  }

  // Check for 'N روز آینده' or 'N روز بعد'
  const daysAheadMatch = cleaned.match(/(\d+)\s*روز\s*(آینده|بعد)/);
  if (daysAheadMatch && daysAheadMatch[1]) {
    const days = parseInt(daysAheadMatch[1], 10);
    if (!isNaN(days) && days >= 0 && days <= 365) {
      return addDaysHelper(ty!, tm!, td!, days);
    }
  }

  // Check for 'آخر هفته' (weekend / 3 days ahead)
  if (cleaned.includes("آخر هفته")) {
    return addDaysHelper(ty!, tm!, td!, 3);
  }

  // Check for 'هفته آینده' or 'هفته بعد'
  if (cleaned.includes("هفته آینده") || cleaned.includes("هفته بعد")) {
    return addDaysHelper(ty!, tm!, td!, 7);
  }

  // Try parsing with native Date parser if it's a recognizable date format
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toISOString().split("T")[0]!;
    } catch {
      // ignore
    }
  }

  // Fallback to today
  return todayStr;
}

export const formatDate = (value: Date | string): string => {
  try {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return dateFormat.format(new Date());
      return dateFormat.format(value);
    }
    const safeDate = normalizeDateParam(value);
    const [y, m, d] = safeDate.split("-").map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d!));
    if (isNaN(date.getTime())) return dateFormat.format(new Date());
    return dateFormat.format(date);
  } catch {
    return dateFormat.format(new Date());
  }
};

export const formatFullDate = (value: Date | string): string => {
  try {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return fullDateFormat.format(new Date());
      return fullDateFormat.format(value);
    }
    const safeDate = normalizeDateParam(value);
    const [y, m, d] = safeDate.split("-").map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d!));
    if (isNaN(date.getTime())) return fullDateFormat.format(new Date());
    return fullDateFormat.format(date);
  } catch {
    return fullDateFormat.format(new Date());
  }
};

export function addDays(dateStr: string, days: number): string {
  const safeDate = normalizeDateParam(dateStr);
  const [y, m, d] = safeDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0]!;
  }
  return date.toISOString().split("T")[0]!;
}

export function daysDiff(dateStr1: string, dateStr2: string): number {
  const safeDate1 = normalizeDateParam(dateStr1);
  const safeDate2 = normalizeDateParam(dateStr2);
  const [y1, m1, d1] = safeDate1.split("-").map(Number);
  const [y2, m2, d2] = safeDate2.split("-").map(Number);
  const utc1 = Date.UTC(y1!, m1! - 1, d1!);
  const utc2 = Date.UTC(y2!, m2! - 1, d2!);
  const diff = Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? 0 : diff;
}
