import { describe, expect, it } from "vitest";

import { utcToLocalString } from "../common/dates";
import { pickupTimeFor } from "./pickup";
import { transferQuoteQuerySchema, vehicleFits } from "./transfers.schema";

const TEHRAN = 210;

describe("pickupTimeFor", () => {
  it("meets a night arrival on the next calendar day", () => {
    // Departs 23:50 on 1 Dec, lands 01:30 on 2 Dec (Tehran time)
    const flight = {
      departureUtc: "2026-12-01T20:20:00.000Z",
      arrivalUtc: "2026-12-01T22:00:00.000Z",
      international: false,
    };
    const pickup = pickupTimeFor(flight, "FROM_AIRPORT", 40);
    expect(utcToLocalString(pickup, TEHRAN)).toBe("2026-12-02T02:00");
  });

  it("allows longer for bags on an international arrival", () => {
    const flight = {
      departureUtc: "2026-12-01T06:00:00.000Z",
      arrivalUtc: "2026-12-01T09:00:00.000Z",
      international: true,
    };
    expect(pickupTimeFor(flight, "FROM_AIRPORT", 60).toISOString()).toBe(
      "2026-12-01T10:00:00.000Z",
    );
  });

  it("leaves for the airport early enough for check-in, the drive and traffic", () => {
    const flight = {
      departureUtc: "2026-12-01T10:00:00.000Z",
      arrivalUtc: "2026-12-01T11:00:00.000Z",
      international: false,
    };
    // 120 check-in + 45 drive + 15 buffer = 3 hours before
    expect(pickupTimeFor(flight, "TO_AIRPORT", 45).toISOString()).toBe("2026-12-01T07:00:00.000Z");
    expect(pickupTimeFor({ ...flight, international: true }, "TO_AIRPORT", 45).toISOString()).toBe(
      "2026-12-01T06:00:00.000Z",
    );
  });
});

describe("vehicles", () => {
  it("puts 5 people with 6 bags in a van, not a sedan", () => {
    expect(vehicleFits("SEDAN", 5, 6)).toBe(false);
    expect(vehicleFits("VIP", 5, 6)).toBe(false);
    expect(vehicleFits("VAN", 5, 6)).toBe(true);
    expect(vehicleFits("SEDAN", 2, 2)).toBe(true);
  });
});

describe("transferQuoteQuerySchema", () => {
  it("needs exactly one of flight or booking and one of hotel or zone", () => {
    expect(
      transferQuoteQuerySchema.safeParse({ flightId: "x", direction: "FROM_AIRPORT", zoneId: "z" })
        .success,
    ).toBe(true);
    expect(
      transferQuoteQuerySchema.safeParse({ direction: "FROM_AIRPORT", zoneId: "z" }).success,
    ).toBe(false);
    expect(
      transferQuoteQuerySchema.safeParse({
        flightId: "x",
        bookingId: "y",
        direction: "FROM_AIRPORT",
        zoneId: "z",
      }).success,
    ).toBe(false);
    expect(
      transferQuoteQuerySchema.safeParse({ flightId: "x", direction: "TO_AIRPORT" }).success,
    ).toBe(false);
  });
});
