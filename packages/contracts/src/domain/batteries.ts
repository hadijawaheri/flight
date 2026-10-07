/**
 * Lithium battery carriage under the ICAO Technical Instructions / IATA DGR that apply to every
 * airline: spare batteries and power banks travel in the cabin only; ≤100 Wh needs no approval,
 * 100–160 Wh needs airline approval, above 160 Wh is forbidden. Rules announced for 27 March
 * 2026 limit a passenger to two power banks and forbid recharging them on board; how and when
 * each (Iranian) airline applies them varies, so every message says to confirm with the airline.
 */

export const NOMINAL_CELL_VOLTS = 3.7;

export function wattHoursFromMah(
  milliampHours: number,
  volts: number = NOMINAL_CELL_VOLTS,
): number {
  return (milliampHours * volts) / 1000;
}

export type BatteryVerdict = "ALLOWED" | "NEEDS_APPROVAL" | "FORBIDDEN";

export interface BatteryInput {
  wattHours: number;
  /** A loose battery or power bank, as opposed to one installed in a device. */
  spare: boolean;
}

export interface BatteryResult {
  verdict: BatteryVerdict;
  /** Where it may travel. */
  location: "CABIN_ONLY" | "CABIN_OR_CHECKED";
  maxPerPassenger: number | null;
  message: string;
}

export function evaluateBattery(input: BatteryInput): BatteryResult {
  const { wattHours, spare } = input;
  const location = spare ? "CABIN_ONLY" : "CABIN_OR_CHECKED";

  if (wattHours > 160) {
    return {
      verdict: "FORBIDDEN",
      location,
      maxPerPassenger: 0,
      message:
        "باتری بالای ۱۶۰ وات‌ساعت را مسافر نمی‌تواند همراه ببرد؛ نه در کابین و نه در بار تحویلی.",
    };
  }
  if (wattHours > 100) {
    // The two-battery cap is a rule for loose batteries; an installed one is limited by approval only.
    return {
      verdict: "NEEDS_APPROVAL",
      location,
      maxPerPassenger: spare ? 2 : null,
      message: spare
        ? "بین ۱۰۰ تا ۱۶۰ وات‌ساعت فقط با تأیید قبلی ایرلاین و حداکثر دو عدد برای هر مسافر مجاز است و باید در کابین باشد."
        : "باتری نصب‌شده‌ی بین ۱۰۰ تا ۱۶۰ وات‌ساعت فقط با تأیید قبلی ایرلاین مجاز است.",
    };
  }
  return {
    verdict: "ALLOWED",
    location,
    maxPerPassenger: null,
    message: spare
      ? "تا ۱۰۰ وات‌ساعت بدون تأیید ایرلاین مجاز است؛ پاوربانک و باتری یدکی فقط داخل کیف دستی (کابین)، نه چمدان تحویلی. هر مسافر حداکثر دو پاوربانک می‌تواند داشته باشد و شارژ‌کردن پاوربانک حین پرواز ممنوع است."
      : "باتری نصب‌شده روی دستگاه تا ۱۰۰ وات‌ساعت مجاز است؛ در بار تحویلی دستگاه باید کاملاً خاموش (نه در حالت خواب) و در برابر روشن‌شدن ناخواسته محافظت‌شده باشد.",
  };
}
