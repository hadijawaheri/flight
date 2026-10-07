import { percentOf } from "../common/money";
import type { FlightType } from "./fare";

export const FARE_FAMILIES = ["SAVER", "STANDARD", "FLEX"] as const;
export type FareFamily = (typeof FARE_FAMILIES)[number];

export interface RefundTier {
  /** The tier applies while at least this many hours remain before departure. */
  minHoursBefore: number;
  penaltyPercent: number;
  label: string;
}

export interface RefundPolicy {
  refundable: boolean;
  tiers: RefundTier[];
  /** Penalty after departure or for no-show. */
  noShowPenaltyPercent: number;
}

/**
 * Simulated fare-family rules in the shape Iranian airlines publish them: a stepped penalty on the
 * base fare by time before departure. Real values depend on airline and booking class (letter), and
 * real tables cut bands at "noon three days / noon one day / 3 hours / 30 minutes before"; the
 * simulation measures plain hours so a quote is reproducible from the departure time alone.
 */
export function refundPolicyFor(flightType: FlightType, family: FareFamily): RefundPolicy {
  if (flightType === "CHARTER") {
    // Charter tickets are mostly non-refundable and the few refundable ones carry heavy penalties,
    // so the sample sits at the strict end of what agencies publish (about 50-60% early, 70-80%
    // within three days, the whole base fare close to departure).
    return {
      refundable: true,
      noShowPenaltyPercent: 100,
      tiers: [
        { minHoursBefore: 72, penaltyPercent: 50, label: "بیش از ۷۲ ساعت مانده" },
        { minHoursBefore: 24, penaltyPercent: 80, label: "۲۴ تا ۷۲ ساعت مانده" },
        { minHoursBefore: 0, penaltyPercent: 100, label: "کمتر از ۲۴ ساعت مانده" },
      ],
    };
  }
  if (family === "SAVER") {
    return {
      refundable: true,
      noShowPenaltyPercent: 100,
      tiers: [
        { minHoursBefore: 24, penaltyPercent: 30, label: "بیش از ۲۴ ساعت مانده" },
        { minHoursBefore: 3, penaltyPercent: 50, label: "۳ تا ۲۴ ساعت مانده" },
        { minHoursBefore: 0, penaltyPercent: 70, label: "کمتر از ۳ ساعت مانده" },
      ],
    };
  }
  if (family === "STANDARD") {
    return {
      refundable: true,
      noShowPenaltyPercent: 80,
      tiers: [
        { minHoursBefore: 72, penaltyPercent: 15, label: "بیش از ۷۲ ساعت مانده" },
        { minHoursBefore: 24, penaltyPercent: 25, label: "۲۴ تا ۷۲ ساعت مانده" },
        { minHoursBefore: 3, penaltyPercent: 40, label: "۳ تا ۲۴ ساعت مانده" },
        { minHoursBefore: 0, penaltyPercent: 60, label: "کمتر از ۳ ساعت مانده" },
      ],
    };
  }
  return {
    refundable: true,
    noShowPenaltyPercent: 50,
    tiers: [
      { minHoursBefore: 72, penaltyPercent: 5, label: "بیش از ۷۲ ساعت مانده" },
      { minHoursBefore: 24, penaltyPercent: 15, label: "۲۴ تا ۷۲ ساعت مانده" },
      { minHoursBefore: 3, penaltyPercent: 25, label: "۳ تا ۲۴ ساعت مانده" },
      { minHoursBefore: 0, penaltyPercent: 40, label: "کمتر از ۳ ساعت مانده" },
    ],
  };
}

/**
 * Reasons that remove the penalty. The CAO passenger-rights directive for domestic flights (1394)
 * gives a full refund when the airline cancels and, on withdrawal, when the delay exceeds 2 hours.
 */
export const INVOLUNTARY_REFUND_REASONS = ["AIRLINE_CANCELLED", "DELAY_OVER_2H"] as const;
export type RefundReason = "VOLUNTARY" | (typeof INVOLUNTARY_REFUND_REASONS)[number];

export interface RefundInput {
  /** Amounts actually paid, rial. */
  baseFare: number;
  taxes: number;
  serviceFee: number;
  policy: RefundPolicy;
  /** Negative once the flight has departed. */
  hoursBeforeDeparture: number;
  reason?: RefundReason;
}

export interface RefundResult {
  penaltyPercent: number;
  penaltyAmount: number;
  /** Service fees (and seat fees) are never returned on voluntary refunds; this platform's own rule. */
  nonRefundableFees: number;
  refundAmount: number;
  tierLabel: string;
  isNoShow: boolean;
}

export function calculateRefund(input: RefundInput): RefundResult {
  const paid = input.baseFare + input.taxes + input.serviceFee;
  const reason = input.reason ?? "VOLUNTARY";

  if (reason !== "VOLUNTARY") {
    return {
      penaltyPercent: 0,
      penaltyAmount: 0,
      nonRefundableFees: 0,
      refundAmount: paid,
      tierLabel:
        reason === "DELAY_OVER_2H"
          ? "تأخیر بیش از ۲ ساعت؛ بدون جریمه (بر پایه‌ی دستورالعمل پرواز داخلی؛ در پرواز خارجی یا چارتر ایرلاین تعیین می‌کند)"
          : "لغو از سمت ایرلاین؛ بدون جریمه",
      isNoShow: false,
    };
  }

  const isNoShow = input.hoursBeforeDeparture < 0;
  let penaltyPercent = input.policy.noShowPenaltyPercent;
  let tierLabel = "پس از زمان پرواز (نوشو)";

  if (!isNoShow) {
    const tier = [...input.policy.tiers]
      .sort((a, b) => b.minHoursBefore - a.minHoursBefore)
      .find((candidate) => input.hoursBeforeDeparture >= candidate.minHoursBefore);
    const fallback = input.policy.tiers[input.policy.tiers.length - 1];
    penaltyPercent = (tier ?? fallback)?.penaltyPercent ?? 100;
    tierLabel = (tier ?? fallback)?.label ?? "";
  }

  const penaltyAmount = percentOf(input.baseFare, penaltyPercent);
  const refundAmount = Math.max(0, input.baseFare - penaltyAmount + input.taxes);
  return {
    penaltyPercent,
    penaltyAmount,
    nonRefundableFees: input.serviceFee,
    refundAmount,
    tierLabel,
    isNoShow,
  };
}
