import type { PaymentInitiateResponseDto, PaymentReceiptDto } from "@flysmart/contracts";

export abstract class PaymentProvider {
  abstract initiate(
    bookingId: string,
    amount: number,
    description: string,
    callbackUrl: string,
  ): Promise<PaymentInitiateResponseDto>;

  abstract verify(
    authority: string,
    status: string,
    bookingId: string,
    expectedAmount: number,
  ): Promise<PaymentReceiptDto>;
}
