import { describe, expect, it } from "vitest";

import { type HotelCancellationPolicy, hotelSearchQuerySchema } from "./hotels.schema";
import {
  checkInInstant,
  freeCancellationUntil,
  hotelRefundQuote,
  nightsBetween,
  stayDatesForTrip,
} from "./stay";

const TEHRAN = 210;
const DUBAI = 240;

const policy: HotelCancellationPolicy = {
  refundable: true,
  noShowPenaltyPercent: 100,
  tiers: [
    { minHoursBeforeCheckIn: 72, penaltyPercent: 0, label: "بیش از ۷۲ ساعت مانده" },
    { minHoursBeforeCheckIn: 24, penaltyPercent: 30, label: "۲۴ تا ۷۲ ساعت مانده" },
    { minHoursBeforeCheckIn: 0, penaltyPercent: 100, label: "کمتر از ۲۴ ساعت مانده" },
  ],
};

describe("nightsBetween", () => {
  it("counts nights and never goes negative", () => {
    expect(nightsBetween("2026-12-01", "2026-12-04")).toBe(3);
    expect(nightsBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(nightsBetween("2026-12-04", "2026-12-01")).toBe(0);
  });
});

describe("stayDatesForTrip", () => {
  it("checks in on the local arrival day and out on the return day", () => {
    const stay = stayDatesForTrip(
      // 18:00 Tehran on 1 Dec
      { arrivalUtc: "2026-12-01T14:30:00.000Z", destinationUtcOffsetMinutes: TEHRAN },
      // 10:00 Tehran on 5 Dec
      { departureUtc: "2026-12-05T06:30:00.000Z", originUtcOffsetMinutes: TEHRAN },
    );
    expect(stay).toEqual({ checkIn: "2026-12-01", checkOut: "2026-12-05", nights: 4 });
  });

  it("uses the local date for an arrival after midnight, not the UTC date", () => {
    // 01:30 Tehran on 2 Dec is still 1 Dec in UTC
    const stay = stayDatesForTrip(
      { arrivalUtc: "2026-12-01T22:00:00.000Z", destinationUtcOffsetMinutes: TEHRAN },
      null,
      2,
    );
    expect(stay).toEqual({ checkIn: "2026-12-02", checkOut: "2026-12-04", nights: 2 });
  });

  it("uses the destination's own offset abroad", () => {
    // 23:00 UTC is 03:00 next day in Dubai
    const stay = stayDatesForTrip(
      { arrivalUtc: "2026-12-01T23:00:00.000Z", destinationUtcOffsetMinutes: DUBAI },
      { departureUtc: "2026-12-04T20:00:00.000Z", originUtcOffsetMinutes: DUBAI },
    );
    expect(stay?.checkIn).toBe("2026-12-02");
    expect(stay?.checkOut).toBe("2026-12-05");
  });

  it("returns null for a same-day return", () => {
    expect(
      stayDatesForTrip(
        { arrivalUtc: "2026-12-01T05:00:00.000Z", destinationUtcOffsetMinutes: TEHRAN },
        { departureUtc: "2026-12-01T15:00:00.000Z", originUtcOffsetMinutes: TEHRAN },
      ),
    ).toBeNull();
  });
});

describe("hotelRefundQuote", () => {
  it("is free early, stepped later and total on no-show", () => {
    expect(hotelRefundQuote({ total: 10_000_000, policy, hoursBeforeCheckIn: 100 })).toMatchObject({
      penaltyPercent: 0,
      refundAmount: 10_000_000,
    });
    expect(hotelRefundQuote({ total: 10_000_000, policy, hoursBeforeCheckIn: 30 })).toMatchObject({
      penaltyPercent: 30,
      penaltyAmount: 3_000_000,
      refundAmount: 7_000_000,
    });
    expect(hotelRefundQuote({ total: 10_000_000, policy, hoursBeforeCheckIn: -1 })).toMatchObject({
      isNoShow: true,
      refundAmount: 0,
    });
  });

  it("refunds everything when the hotel cannot honour the booking", () => {
    expect(
      hotelRefundQuote({ total: 5_000_000, policy, hoursBeforeCheckIn: 2, involuntary: true }),
    ).toMatchObject({ penaltyAmount: 0, refundAmount: 5_000_000 });
  });

  it("keeps everything for a non-refundable rate", () => {
    const strict = { ...policy, refundable: false };
    expect(
      hotelRefundQuote({ total: 5_000_000, policy: strict, hoursBeforeCheckIn: 500 }).refundAmount,
    ).toBe(0);
  });
});

describe("check-in time", () => {
  it("converts the local check-in hour to an instant", () => {
    expect(checkInInstant("2026-12-01", "14:00", TEHRAN).toISOString()).toBe(
      "2026-12-01T10:30:00.000Z",
    );
  });

  it("states until when cancelling is free", () => {
    expect(freeCancellationUntil(policy, "2026-12-10", "14:00", TEHRAN)).toBe("2026-12-07T14:00");
    expect(
      freeCancellationUntil(
        { ...policy, tiers: policy.tiers.filter((tier) => tier.penaltyPercent > 0) },
        "2026-12-10",
        "14:00",
        TEHRAN,
      ),
    ).toBeNull();
  });
});

describe("hotelSearchQuerySchema", () => {
  it("accepts a stay and fills defaults", () => {
    const parsed = hotelSearchQuerySchema.parse({
      city: "mhd",
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      breakfast: "true",
    });
    expect(parsed).toMatchObject({ city: "MHD", adults: 1, rooms: 1, breakfast: true });
  });

  it("rejects reversed dates, overlong stays and more rooms than adults", () => {
    const base = { city: "MHD", checkIn: "2026-12-05", checkOut: "2026-12-03" };
    expect(hotelSearchQuerySchema.safeParse(base).success).toBe(false);
    expect(
      hotelSearchQuerySchema.safeParse({ ...base, checkIn: "2026-12-01", checkOut: "2027-02-01" })
        .success,
    ).toBe(false);
    expect(
      hotelSearchQuerySchema.safeParse({
        ...base,
        checkIn: "2026-12-01",
        adults: 1,
        rooms: 2,
      }).success,
    ).toBe(false);
  });
});
