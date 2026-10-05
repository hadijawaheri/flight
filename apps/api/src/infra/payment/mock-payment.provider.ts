import { randomInt } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type { ChargeRequest, ChargeResult, RefundRequest } from "./payment.provider.js";
import { PaymentProvider } from "./payment.provider.js";

const reference = (prefix: string): string => `${prefix}-${randomInt(10_000_000, 100_000_000)}`;

/** Simulated gateway: approves or declines on request and moves no money. */
@Injectable()
export class MockPaymentProvider extends PaymentProvider {
  readonly name = "mock";
  readonly simulated = true;

  charge(request: ChargeRequest): Promise<ChargeResult> {
    if (request.requestedOutcome === "FAILURE") {
      return Promise.resolve({ status: "FAILED", reason: "پرداخت توسط درگاه شبیه‌ساز رد شد" });
    }
    return Promise.resolve({ status: "SUCCEEDED", referenceId: reference("MOCK") });
  }

  refund(request: RefundRequest): Promise<{ referenceId: string }> {
    void request;
    return Promise.resolve({ referenceId: reference("MOCK-RF") });
  }
}
