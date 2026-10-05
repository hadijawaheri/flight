import { describe, expect, it } from "vitest";

import { createBookingSchema } from "./bookings.schema";

const passenger = {
  firstNameFa: "علی",
  lastNameFa: "محمدی",
  firstNameEn: "Ali",
  lastNameEn: "Mohammadi",
  nationalId: "0499370899",
  birthDate: "1990-05-15",
  gender: "MALE",
} as const;

describe("createBookingSchema", () => {
  const booking = {
    outboundFlightId: "THRMHD20261015IR01E",
    passengers: [passenger],
    contact: { mobile: "09123456789" },
    quotedTotal: 2_500_000,
  };

  it("accepts a one-way booking and defaults the seat preference", () => {
    const parsed = createBookingSchema.parse(booking);
    expect(parsed.seatPreference).toBe("ANY");
  });

  it("rejects an empty passenger list and duplicated national codes", () => {
    expect(createBookingSchema.safeParse({ ...booking, passengers: [] }).success).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...booking, passengers: [passenger, passenger] }).success,
    ).toBe(false);
  });
});
