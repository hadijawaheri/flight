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

const foreigner = {
  firstNameEn: "John",
  lastNameEn: "Smith",
  nationality: "DE",
  birthDate: "1985-03-02",
  gender: "MALE",
  passportNumber: "C01X00T8R",
  passportExpiry: "2031-01-01",
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

  it("defaults the passport acknowledgement to false", () => {
    expect(createBookingSchema.parse(booking).passportValidityAcknowledged).toBe(false);
    expect(
      createBookingSchema.parse({ ...booking, passportValidityAcknowledged: true })
        .passportValidityAcknowledged,
    ).toBe(true);
  });

  it("books a foreign passenger without a national code", () => {
    const parsed = createBookingSchema.parse({ ...booking, passengers: [passenger, foreigner] });
    expect(parsed.passengers[0]?.nationality).toBe("IR");
    expect(parsed.passengers[1]?.nationality).toBe("DE");
    expect(parsed.passengers[1]?.nationalId).toBeUndefined();
  });

  it("rejects a foreign passenger without a passport", () => {
    const noPassport = { ...foreigner, passportNumber: undefined };
    expect(
      createBookingSchema.safeParse({ ...booking, passengers: [passenger, noPassport] }).success,
    ).toBe(false);
  });

  it("detects the same foreigner twice by country and passport number", () => {
    const twin = { ...foreigner, firstNameEn: "Johnny" };
    expect(
      createBookingSchema.safeParse({ ...booking, passengers: [foreigner, twin] }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({
        ...booking,
        passengers: [foreigner, { ...twin, passportNumber: "C01X00T8S" }],
      }).success,
    ).toBe(true);
  });
});
