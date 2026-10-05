export type PaymentOutcome = "SUCCESS" | "FAILURE";

export interface ChargeRequest {
  paymentId: string;
  bookingId: string;
  /** Rial. */
  amount: number;
  description: string;
  /** Only the simulated gateway honours this; real gateways decide on their own. */
  requestedOutcome: PaymentOutcome;
}

export type ChargeResult =
  { status: "SUCCEEDED"; referenceId: string } | { status: "FAILED"; reason: string };

export interface RefundRequest {
  paymentId: string;
  referenceId: string;
  amount: number;
}

export abstract class PaymentProvider {
  abstract readonly name: string;
  /** True for gateways that move no real money. */
  abstract readonly simulated: boolean;

  abstract charge(request: ChargeRequest): Promise<ChargeResult>;
  abstract refund(request: RefundRequest): Promise<{ referenceId: string }>;
}
