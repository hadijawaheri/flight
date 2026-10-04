import { randomUUID } from "node:crypto";

import type { PaymentInitiateResponseDto, PaymentReceiptDto } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { PaymentProvider } from "./payment.provider.js";

@Injectable()
export class MockPaymentProvider extends PaymentProvider {
  private transactions: Map<
    string,
    { bookingId: string; amount: number; authority: string; createdAt: Date }
  > = new Map();

  async initiate(
    bookingId: string,
    amount: number,
    _description: string,
    callbackUrl: string,
  ): Promise<PaymentInitiateResponseDto> {
    const authority = `AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
    const paymentId = `pay-${randomUUID().slice(0, 8)}`;

    this.transactions.set(authority, {
      bookingId,
      amount,
      authority,
      createdAt: new Date(),
    });

    const parsedUrl = new URL(callbackUrl);
    parsedUrl.searchParams.set("Authority", authority);
    parsedUrl.searchParams.set("Status", "OK");
    parsedUrl.searchParams.set("bookingId", bookingId);

    return {
      paymentId,
      paymentUrl: parsedUrl.toString(),
      amount,
    };
  }

  async verify(
    authority: string,
    status: string,
    bookingId: string,
    expectedAmount: number,
  ): Promise<PaymentReceiptDto> {
    const isSuccess = status === "OK" || status === "100";
    const trackingCode = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      paymentId: `pay-${randomUUID().slice(0, 8)}`,
      bookingId,
      bookingReference: `PNR-${randomUUID().slice(0, 6).toUpperCase()}`,
      trackingCode,
      cardPanMasked: "۶۰۳۷-۹۹**-****-۱۲۳۴",
      amount: expectedAmount,
      isSuccessful: isSuccess,
      message: isSuccess
        ? "پرداخت با موفقیت انجام شد و بلیط صادر گردید."
        : "پرداخت توسط کاربر لغو شد.",
      paidAt: new Date().toISOString(),
    };
  }
}
