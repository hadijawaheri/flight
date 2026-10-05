/** Money is always an integer number of rial. The UI shows toman (rial / 10). */
export function rialToToman(rial: number): number {
  return Math.round(rial / 10);
}

export function tomanToRial(toman: number): number {
  return Math.round(toman * 10);
}

/** Domestic fares are quoted in steps of 1,000 toman (10,000 rial). */
export const FARE_ROUNDING_STEP_RIAL = 10_000;

export function roundRial(value: number, step: number = FARE_ROUNDING_STEP_RIAL): number {
  return Math.round(value / step) * step;
}

export function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

const FA_NUMBER = new Intl.NumberFormat("fa-IR");

/** Persian-digit amount in toman, the unit people read prices in: `۳٬۵۰۰٬۰۰۰ تومان`. */
export function formatToman(rial: number): string {
  return `${FA_NUMBER.format(rialToToman(rial))} تومان`;
}
