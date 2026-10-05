import type {
  BookingDto,
  BookingListItemDto,
  BookingPassengerDto,
  BookingStatus,
  BookingSliceDto,
} from "@flysmart/contracts";
import { maskNationalCode } from "@flysmart/contracts";

import type { Booking, BookingPassenger } from "./schemas/booking.schema.js";

/** A held booking whose time ran out is expired for every reader, before any sweeper runs. */
export function effectiveStatus(
  booking: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date,
): BookingStatus {
  if (
    booking.status === "PENDING_PAYMENT" &&
    booking.holdExpiresAt &&
    booking.holdExpiresAt <= now
  ) {
    return "EXPIRED";
  }
  return booking.status;
}

function maskPassport(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 3 ? "***" : `${"*".repeat(value.length - 3)}${value.slice(-3)}`;
}

function toPassengerDto(passenger: BookingPassenger): BookingPassengerDto {
  return {
    index: passenger.index,
    type: passenger.types.OUTBOUND ?? passenger.types.RETURN ?? "ADULT",
    firstNameFa: passenger.firstNameFa,
    lastNameFa: passenger.lastNameFa,
    firstNameEn: passenger.firstNameEn,
    lastNameEn: passenger.lastNameEn,
    nationalIdMasked: maskNationalCode(passenger.nationalId),
    passportNumberMasked: maskPassport(passenger.passportNumber),
    seats: passenger.seats,
    tickets: passenger.tickets,
  };
}

export function toBookingDto(booking: Booking, now: Date): BookingDto {
  const slices: BookingSliceDto[] = booking.slices.map((slice) => ({
    direction: slice.direction,
    flight: slice.flight,
    fare: slice.fare,
    seatFees: slice.seatFees,
    refundPolicy: slice.refundPolicy,
    departed: slice.departureUtc <= now,
  }));
  return {
    id: booking._id.toString(),
    pnr: booking.pnr,
    status: effectiveStatus(booking, now),
    slices,
    passengers: booking.passengers.map(toPassengerDto),
    contact: { mobile: booking.contact.mobile, email: booking.contact.email },
    totals: booking.totals,
    holdExpiresAt: booking.holdExpiresAt ? booking.holdExpiresAt.toISOString() : null,
    paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    refund: booking.refund
      ? {
          refundAmount: booking.refund.refundAmount,
          penaltyAmount: booking.refund.penaltyAmount,
          nonRefundableFees: booking.refund.nonRefundableFees,
          processedAt: booking.refund.processedAt.toISOString(),
        }
      : null,
    createdAt: booking.createdAt.toISOString(),
  };
}

export function toBookingListItem(booking: Booking, now: Date): BookingListItemDto {
  const first = booking.slices[0];
  const second = booking.slices[1];
  return {
    id: booking._id.toString(),
    pnr: booking.pnr,
    status: effectiveStatus(booking, now),
    originCode: first?.flight.origin.airportCode ?? "",
    destinationCode: first?.flight.destination.airportCode ?? "",
    originCityFa: first?.flight.origin.cityFa ?? "",
    destinationCityFa: first?.flight.destination.cityFa ?? "",
    departureUtc: booking.firstDepartureUtc.toISOString(),
    returnDepartureUtc: second ? second.departureUtc.toISOString() : null,
    passengerCount: booking.passengers.length,
    total: booking.totals.total,
    createdAt: booking.createdAt.toISOString(),
  };
}
