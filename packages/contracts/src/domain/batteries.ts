/**
 * Lithium battery carriage under the ICAO/IATA dangerous goods rules that apply to every airline:
 * spare batteries and power banks travel in the cabin only; ≤100 Wh is free, 100–160 Wh needs
 * airline approval (max two), above 160 Wh is forbidden.
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
      message: "باتری بالای ۱۶۰ وات‌ساعت در هیچ بخشی از پرواز مجاز نیست.",
    };
  }
  if (wattHours > 100) {
    return {
      verdict: "NEEDS_APPROVAL",
      location,
      maxPerPassenger: 2,
      message:
        "بین ۱۰۰ تا ۱۶۰ وات‌ساعت فقط با تأیید قبلی ایرلاین و حداکثر دو عدد برای هر مسافر مجاز است.",
    };
  }
  return {
    verdict: "ALLOWED",
    location,
    maxPerPassenger: null,
    message: spare
      ? "تا ۱۰۰ وات‌ساعت مجاز است؛ پاوربانک و باتری یدکی فقط داخل کیف دستی (کابین)، نه چمدان تحویلی."
      : "باتری نصب‌شده روی دستگاه تا ۱۰۰ وات‌ساعت مجاز است.",
  };
}
