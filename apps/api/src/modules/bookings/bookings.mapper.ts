import type { BookingDto } from "@flysmart/contracts";

import type { BookingDocument } from "./schemas/booking.schema.js";

export function toBookingDto(doc: BookingDocument): BookingDto {
  return {
    id: doc._id.toHexString(),
    bookingReference: doc.bookingReference,
    userId: doc.userId.toHexString(),
    flight: doc.flightSnapshot,
    passengers: doc.passengers,
    tickets: doc.tickets,
    totalAmount: doc.totalAmount,
    status: doc.status,
    contactMobile: doc.contactMobile,
    contactEmail: doc.contactEmail ?? undefined,
    paymentId: doc.paymentId ?? undefined,
    expiresAt: doc.expiresAt.toISOString(),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    paidAt: doc.paidAt ? doc.paidAt.toISOString() : undefined,
  };
}
