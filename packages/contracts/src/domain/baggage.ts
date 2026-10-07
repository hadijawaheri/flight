import { percentOf } from "../common/money";

/**
 * Default excess-baggage rate: percent of the route's economy fare per extra kilogram. Iranian
 * domestic carriers commonly quote 1% (a few more); IATA's weight-system norm is roughly 1–1.5%
 * of the highest one-way economy fare, and many airlines now publish flat per-kg rates instead.
 */
export const EXCESS_BAGGAGE_RATE_PERCENT = 1;

export interface ExcessBaggageInput {
  allowanceKg: number;
  /** Total weight of checked bags. */
  baggageKg: number;
  /** Full-price adult economy fare of the route, rial. */
  fullEconomyFare: number;
  /** Rate per kg as percent of fullEconomyFare; airlines publish their own. */
  ratePercentPerKg?: number;
}

export interface ExcessBaggageResult {
  excessKg: number;
  feePerKg: number;
  totalFee: number;
}

export function calculateExcessBaggage(input: ExcessBaggageInput): ExcessBaggageResult {
  const excessKg = Math.max(0, Math.ceil(input.baggageKg - input.allowanceKg));
  const feePerKg = percentOf(
    input.fullEconomyFare,
    input.ratePercentPerKg ?? EXCESS_BAGGAGE_RATE_PERCENT,
  );
  return { excessKg, feePerKg, totalFee: excessKg * feePerKg };
}
