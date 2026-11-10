import { addDaysIso, diffDaysIso, hoursBetween, localToUtc, toIsoDate } from "../common/dates";
import { percentOf } from "../common/money";
import type { HotelCancellationPolicy } from "./hotels.schema";

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, diffDaysIso(checkOut, checkIn));
}

/** The calendar date of an instant at a fixed UTC offset. */
function localDate(instant: string | Date, utcOffsetMinutes: number): string {
  return toIsoDate(new Date(new Date(instant).getTime() + utcOffsetMinutes * 60_000));
}

/** The parts of a booked flight that decide hotel dates. */
export interface StayFlight {
  arrivalUtc: string | Date;
  departureUtc: string | Date;
  /** UTC offset at the destination of the outbound flight (the hotel's city). */
  destinationUtcOffsetMinutes: number;
  /** UTC offset at the origin of the return flight (the same city). */
  originUtcOffsetMinutes: number;
}

export interface TripStay {
  checkIn: string;
  checkOut: string;
  nights: number;
}

/**
 * Hotel dates that follow a flight booking: check-in is the outbound arrival day at the destination
 * (local time, so a 01:30 arrival checks in that same calendar day), check-out is the day the
 * return flight leaves. One-way trips take the nights the traveller picks. Null when the return
 * leaves on the arrival day and no night is needed.
 */
export function stayDatesForTrip(
  outbound: Pick<StayFlight, "arrivalUtc" | "destinationUtcOffsetMinutes">,
  inbound: Pick<StayFlight, "departureUtc" | "originUtcOffsetMinutes"> | null,
  oneWayNights = 1,
): TripStay | null {
  const checkIn = localDate(outbound.arrivalUtc, outbound.destinationUtcOffsetMinutes);
  const checkOut = inbound
    ? localDate(inbound.departureUtc, inbound.originUtcOffsetMinutes)
    : addDaysIso(checkIn, Math.max(1, Math.round(oneWayNights)));
  const nights = nightsBetween(checkIn, checkOut);
  return nights >= 1 ? { checkIn, checkOut, nights } : null;
}

/** Parses a `HH:mm` wall clock into minutes after midnight. */
export function minutesOfDay(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}

/** The instant check-in opens, from the hotel's local date, time and UTC offset. */
export function checkInInstant(
  checkIn: string,
  checkInTime: string,
  utcOffsetMinutes: number,
): Date {
  return localToUtc(checkIn, minutesOfDay(checkInTime), utcOffsetMinutes);
}

export interface HotelRefundInput {
  /** What was paid for the stay, rial. */
  total: number;
  policy: HotelCancellationPolicy;
  /** Negative once check-in time has passed. */
  hoursBeforeCheckIn: number;
  /** The hotel could not honour the booking; nothing is withheld. */
  involuntary?: boolean;
}

export interface HotelRefundResult {
  penaltyPercent: number;
  penaltyAmount: number;
  refundAmount: number;
  tierLabel: string;
  isNoShow: boolean;
}

export function hotelRefundQuote(input: HotelRefundInput): HotelRefundResult {
  if (input.involuntary) {
    return {
      penaltyPercent: 0,
      penaltyAmount: 0,
      refundAmount: input.total,
      tierLabel: "لغو از سمت هتل؛ بدون جریمه",
      isNoShow: false,
    };
  }
  const isNoShow = input.hoursBeforeCheckIn < 0;
  let penaltyPercent = input.policy.refundable ? input.policy.noShowPenaltyPercent : 100;
  let tierLabel = input.policy.refundable ? "پس از زمان ورود (عدم حضور)" : "غیرقابل استرداد";

  if (input.policy.refundable && !isNoShow) {
    const tiers = [...input.policy.tiers].sort(
      (a, b) => b.minHoursBeforeCheckIn - a.minHoursBeforeCheckIn,
    );
    const tier =
      tiers.find((candidate) => input.hoursBeforeCheckIn >= candidate.minHoursBeforeCheckIn) ??
      tiers[tiers.length - 1];
    penaltyPercent = tier?.penaltyPercent ?? 100;
    tierLabel = tier?.label ?? "";
  }

  const penaltyAmount = percentOf(input.total, penaltyPercent);
  return {
    penaltyPercent,
    penaltyAmount,
    refundAmount: Math.max(0, input.total - penaltyAmount),
    tierLabel,
    isNoShow,
  };
}

/** Hours from `now` until check-in opens. */
export function hoursBeforeCheckIn(
  checkIn: string,
  checkInTime: string,
  utcOffsetMinutes: number,
  now: Date,
): number {
  return hoursBetween(checkInInstant(checkIn, checkInTime, utcOffsetMinutes), now);
}

/**
 * The last moment cancelling costs nothing, as a local `YYYY-MM-DDTHH:mm`, or null when every
 * tier carries a penalty.
 */
export function freeCancellationUntil(
  policy: HotelCancellationPolicy,
  checkIn: string,
  checkInTime: string,
  utcOffsetMinutes: number,
): string | null {
  if (!policy.refundable) return null;
  const free = policy.tiers
    .filter((tier) => tier.penaltyPercent === 0)
    .sort((a, b) => a.minHoursBeforeCheckIn - b.minHoursBeforeCheckIn)[0];
  if (!free) return null;
  const opens = checkInInstant(checkIn, checkInTime, utcOffsetMinutes);
  const until = new Date(opens.getTime() - free.minHoursBeforeCheckIn * 3_600_000);
  return new Date(until.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 16);
}
