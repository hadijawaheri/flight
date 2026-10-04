import type { PaymentInitiateResponseDto, PaymentReceiptDto } from "@flysmart/contracts";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PaymentProvider } from "../../infra/payment/payment.provider.js";
import { BookingsService } from "../bookings/bookings.service.js";
import type { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";
import type { VerifyPaymentDto } from "./dto/verify-payment.dto.js";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentProvider: PaymentProvider,
    private readonly bookingsService: BookingsService,
  ) {}

  async initiate(
    userId: string | undefined,
    input: InitiatePaymentDto,
  ): Promise<PaymentInitiateResponseDto> {
    const booking = await this.bookingsService.getById(userId, input.bookingId);
    if (!booking) {
      throw new NotFoundException("رزرو یافت نشد");
    }

    if (booking.status !== "PENDING_PAYMENT") {
      throw new BadRequestException("این رزرو در وضعیت قابل پرداخت نیست");
    }

    const description = `خرید بلیط پرواز ${booking.flight.origin} به ${booking.flight.destination} - شماره پیگیری ${booking.bookingReference}`;
    return this.paymentProvider.initiate(
      booking.id,
      booking.totalAmount,
      description,
      input.callbackUrl,
    );
  }

  async verify(input: VerifyPaymentDto): Promise<PaymentReceiptDto> {
    // Note: Verification can be called without user session via gateway callback
    const receipt = await this.paymentProvider.verify(
      input.authority,
      input.status,
      input.bookingId,
      0, // Provider verifies against stored transaction or gateway
    );

    if (receipt.isSuccessful) {
      await this.bookingsService.confirmBookingPayment(input.bookingId, receipt.paymentId);
    }

    return receipt;
  }
}
