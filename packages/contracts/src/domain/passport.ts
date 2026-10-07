import { addDaysIso } from "../common/dates";
import { isIranian } from "../common/nationalities";

/** Many destinations refuse entry below this validity, counted from the last flight. */
export const PASSPORT_MIN_VALIDITY_DAYS = 183;

export type PassportStatus =
  /** Domestic flight and an Iranian passenger: no passport is asked for. */
  | "NOT_REQUIRED"
  | "OK"
  | "MISSING"
  /** A hard fact: the document is not valid on a travel date, so the passenger cannot fly. */
  | "EXPIRED"
  /** Valid on the travel dates but short of six months: a risk the traveller may accept. */
  | "SHORT_VALIDITY";

export const PASSPORT_MESSAGES = {
  missing: "شماره و تاریخ انقضای گذرنامه الزامی است",
  expired: "گذرنامه در تاریخ پرواز منقضی شده است",
  shortValidity:
    "اعتبار گذرنامه کمتر از ۶ ماه پس از سفر است؛ بسیاری از کشورها این را نمی‌پذیرند و ایرلاین ممکن است مانع پرواز شود",
  acknowledgementRequired:
    "برای ادامه باید تأیید کنید که از کمتر بودن اعتبار گذرنامه از ۶ ماه آگاه هستید",
  acknowledgementLabel: "متوجه‌ام و مسئولیت آن با من است",
} as const;

export interface PassportSubject {
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
}

/**
 * Passports are mandatory on international flights and for every foreign passenger (it is their
 * only identity document). Only international trips get the six-month validity warning.
 */
export function assessPassport(
  subject: PassportSubject,
  options: { international: boolean; travelDates: readonly string[] },
): PassportStatus {
  if (!options.international && isIranian(subject.nationality)) return "NOT_REQUIRED";
  if (!subject.passportNumber || !subject.passportExpiry) return "MISSING";

  const lastDate = [...options.travelDates].sort().at(-1);
  if (!lastDate) return "OK";
  if (subject.passportExpiry < lastDate) return "EXPIRED";
  const validFrom = addDaysIso(lastDate, PASSPORT_MIN_VALIDITY_DAYS);
  if (options.international && subject.passportExpiry < validFrom) return "SHORT_VALIDITY";
  return "OK";
}

/** Masks a passport number for tickets and lists, keeping the last three characters: ******123. */
export function maskPassportNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length <= 3 ? "***" : `${"*".repeat(value.length - 3)}${value.slice(-3)}`;
}
