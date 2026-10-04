const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeZone: "Asia/Tehran",
});

export const formatNumber = (value: number): string => numberFormat.format(value);

// Money is stored as integer rial; the UI shows toman
export const formatToman = (rial: number): string =>
  `${numberFormat.format(Math.round(rial / 10))} تومان`;

export const formatDate = (value: Date | string): string => dateFormat.format(new Date(value));

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().split("T")[0]!;
}

export function daysDiff(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const utc1 = Date.UTC(y1!, m1! - 1, d1!);
  const utc2 = Date.UTC(y2!, m2! - 1, d2!);
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}
