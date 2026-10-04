import { describe, expect, it } from "vitest";

import { createBookingSchema } from "./bookings.schema";

describe("createBookingSchema", () => {
  it("validates booking creation with passengers and contact info", () => {
    const bookingInput = {
      flightId: "fl-12345",
      passengers: [
        {
          firstNameFa: "سارا",
          lastNameFa: "احمدی",
          firstNameEn: "Sara",
          lastNameEn: "Ahmadi",
          nationalId: "0499370899",
          birthDate: "1995-08-20",
          gender: "FEMALE",
          passengerType: "ADULT",
          seatPreference: "WINDOW",
        },
      ],
      contactMobile: "09123456789",
      contactEmail: "sara@example.com",
      savePassengersToVault: true,
    };

    const result = createBookingSchema.safeParse(bookingInput);
    expect(result.success).toBe(true);
  });

  it("rejects booking with empty passengers array", () => {
    const emptyPassengers = {
      flightId: "fl-12345",
      passengers: [],
      contactMobile: "09123456789",
    };
    const result = createBookingSchema.safeParse(emptyPassengers);
    expect(result.success).toBe(false);
  });
});
