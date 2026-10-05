import { describe, expect, it } from "vitest";

import { buildFlightId, isFlightId, parseFlightId } from "./flight-id";
import {
  fareCalendarQuerySchema,
  flightQuoteQuerySchema,
  searchFlightsQuerySchema,
} from "./flights.schema";
import { createBookingSchema, assignSeatsSchema } from "../bookings/bookings.schema";
import { createPriceAlertSchema } from "../price-alerts/price-alerts.schema";
import { askAssistantSchema } from "../assistant/assistant.schema";
import { createPassengerSchema, updatePassengerSchema } from "../passengers/passengers.schema";
import { mobileSchema, nationalCodeSchema } from "../common/iran";

describe("flight id", () => {
  it("round-trips", () => {
    const key = {
      origin: "THR",
      destination: "MHD",
      date: "2026-10-20",
      airlineCode: "IR",
      slot: 3,
      cabin: "ECONOMY",
    } as const;
    const id = buildFlightId(key);
    expect(id).toBe("THRMHD20261020IR03E");
    expect(parseFlightId(id)).toEqual(key);
  });

  it("supports alphanumeric airline codes and business cabin", () => {
    const id = buildFlightId({
      origin: "IKA",
      destination: "IST",
      date: "2027-03-21",
      airlineCode: "W5",
      slot: 12,
      cabin: "BUSINESS",
    });
    expect(parseFlightId(id)?.airlineCode).toBe("W5");
    expect(parseFlightId(id)?.cabin).toBe("BUSINESS");
  });

  it("rejects malformed ids and impossible dates", () => {
    expect(isFlightId("nonsense")).toBe(false);
    expect(isFlightId("THRMHD20261320IR03E")).toBe(false);
    expect(isFlightId("THRMHD20260230IR03E")).toBe(false);
    expect(isFlightId("thrmhd20261020ir03e")).toBe(false);
  });
});

describe("search query", () => {
  const base = {
    origin: "thr",
    destination: "mhd",
    date: "۱۲۰۰-۰۱-۰۱".replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))),
  };

  it("normalizes codes, applies defaults and coerces numbers", () => {
    const parsed = searchFlightsQuerySchema.parse({
      origin: "thr",
      destination: "MHD",
      date: "2026-10-20",
      adults: "2",
    });
    expect(parsed.origin).toBe("THR");
    expect(parsed.adults).toBe(2);
    expect(parsed.children).toBe(0);
    expect(parsed.cabin).toBe("ECONOMY");
    expect(parsed.sort).toBe("best");
  });

  it("accepts the Tehran city group", () => {
    expect(
      searchFlightsQuerySchema.safeParse({ origin: "TEH", destination: "MHD", date: "2026-10-20" })
        .success,
    ).toBe(true);
  });

  it("parses csv filters", () => {
    const parsed = searchFlightsQuerySchema.parse({
      origin: "THR",
      destination: "MHD",
      date: "2026-10-20",
      airlines: "ir, w5,x",
      times: "morning,evening",
    });
    expect(parsed.airlines).toEqual(["IR", "W5"]);
    expect(parsed.times).toEqual(["MORNING", "EVENING"]);
  });

  it("rejects the same origin and destination, unknown codes and bad mixes", () => {
    expect(
      searchFlightsQuerySchema.safeParse({
        ...base,
        origin: "THR",
        destination: "THR",
        date: "2026-10-20",
      }).success,
    ).toBe(false);
    expect(
      searchFlightsQuerySchema.safeParse({ origin: "ZZZ", destination: "MHD", date: "2026-10-20" })
        .success,
    ).toBe(false);
    expect(
      searchFlightsQuerySchema.safeParse({
        origin: "THR",
        destination: "MHD",
        date: "2026-10-20",
        adults: 1,
        infants: 2,
      }).success,
    ).toBe(false);
    expect(
      searchFlightsQuerySchema.safeParse({ origin: "THR", destination: "MHD", date: "2026-02-31" })
        .success,
    ).toBe(false);
  });

  it("does not turn the string 'false' into true anywhere", () => {
    const parsed = flightQuoteQuerySchema.parse({ adults: "1", children: "0", infants: "0" });
    expect(parsed).toEqual({ adults: 1, children: 0, infants: 0 });
  });

  it("validates the fare calendar window", () => {
    expect(fareCalendarQuerySchema.parse({ origin: "THR", destination: "MHD" }).days).toBe(30);
    expect(
      fareCalendarQuerySchema.safeParse({ origin: "THR", destination: "MHD", days: 400 }).success,
    ).toBe(false);
  });
});

const adult = {
  firstNameFa: "علی",
  lastNameFa: "رضایی",
  firstNameEn: "ali",
  lastNameEn: "rezaei",
  nationalId: "0499370899",
  birthDate: "1990-05-05",
  gender: "MALE",
} as const;

describe("iran validators", () => {
  it("accepts a valid national code and rejects bad ones", () => {
    expect(nationalCodeSchema.safeParse("0499370899").success).toBe(true);
    expect(nationalCodeSchema.safeParse("۰۴۹۹۳۷۰۸۹۹").success).toBe(true);
    expect(nationalCodeSchema.safeParse("0499370890").success).toBe(false);
    expect(nationalCodeSchema.safeParse("1111111111").success).toBe(false);
    expect(nationalCodeSchema.safeParse("123").success).toBe(false);
  });

  it("normalizes mobile digits", () => {
    expect(mobileSchema.parse("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
    expect(mobileSchema.safeParse("9123456789").success).toBe(false);
  });
});

describe("booking schemas", () => {
  const booking = {
    outboundFlightId: "THRMHD20261020IR03E",
    passengers: [adult],
    contact: { mobile: "09123456789" },
    quotedTotal: 50_000_000,
  };

  it("accepts a minimal booking and uppercases Latin names", () => {
    const parsed = createBookingSchema.parse(booking);
    expect(parsed.passengers[0]?.firstNameEn).toBe("ALI");
    expect(parsed.seatPreference).toBe("ANY");
  });

  it("rejects duplicate national codes and bad flight ids", () => {
    expect(createBookingSchema.safeParse({ ...booking, passengers: [adult, adult] }).success).toBe(
      false,
    );
    expect(createBookingSchema.safeParse({ ...booking, outboundFlightId: "x" }).success).toBe(
      false,
    );
  });

  it("treats an empty email as absent", () => {
    const parsed = createBookingSchema.parse({
      ...booking,
      contact: { mobile: "09123456789", email: "" },
    });
    expect(parsed.contact.email).toBeUndefined();
  });

  it("rejects the same seat chosen twice on a slice", () => {
    const seat = { slice: "OUTBOUND", passengerIndex: 0, seat: "12a" };
    expect(
      assignSeatsSchema.safeParse({ seats: [seat, { ...seat, passengerIndex: 1 }] }).success,
    ).toBe(false);
    expect(assignSeatsSchema.parse({ seats: [seat] }).seats[0]?.seat).toBe("12A");
  });
});

describe("other schemas", () => {
  it("validates a price alert", () => {
    const ok = createPriceAlertSchema.safeParse({
      origin: "THR",
      destination: "KIH",
      date: "2026-11-01",
      targetPrice: 30_000_000,
    });
    expect(ok.success).toBe(true);
    expect(
      createPriceAlertSchema.safeParse({
        origin: "THR",
        destination: "THR",
        date: "2026-11-01",
        targetPrice: 1,
      }).success,
    ).toBe(false);
    expect(
      createPriceAlertSchema.safeParse({
        origin: "THR",
        destination: "KIH",
        date: "2026-11-01",
        targetPrice: -5,
      }).success,
    ).toBe(false);
  });

  it("limits assistant messages", () => {
    expect(askAssistantSchema.parse({ message: "  سلام  " }).message).toBe("سلام");
    expect(askAssistantSchema.safeParse({ message: "" }).success).toBe(false);
    expect(askAssistantSchema.safeParse({ message: "a".repeat(1001) }).success).toBe(false);
  });

  it("does not reset isDefault when a traveler is patched", () => {
    const patch = updatePassengerSchema.parse({ firstNameFa: "علی" });
    expect("isDefault" in patch).toBe(false);
    expect(updatePassengerSchema.parse({ isDefault: true }).isDefault).toBe(true);
  });

  it("validates a saved traveler", () => {
    expect(createPassengerSchema.safeParse({ ...adult }).success).toBe(true);
    expect(createPassengerSchema.safeParse({ ...adult, firstNameEn: "علی" }).success).toBe(false);
  });
});
