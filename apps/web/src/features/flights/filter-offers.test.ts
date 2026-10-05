import type { FlightOfferDto } from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  applyFilters,
  countByTimeBucket,
  EMPTY_FILTERS,
  timeBucketOfOffer,
} from "./filter-offers";

function offer(
  id: string,
  overrides: Partial<FlightOfferDto> & { hour?: number } = {},
): FlightOfferDto {
  const { hour = 9, ...rest } = overrides;
  return {
    id,
    airline: { code: "IR", nameFa: "ایران‌ایر", nameEn: "Iran Air" },
    origin: { localTime: `2026-10-20T${String(hour).padStart(2, "0")}:00` },
    departureUtc: `2026-10-20T${String(hour).padStart(2, "0")}:00:00Z`,
    durationMinutes: 90,
    flightType: "SYSTEMIC",
    pricePerAdult: 30_000_000,
    ...rest,
  } as unknown as FlightOfferDto;
}

describe("filter-offers", () => {
  const offers = [
    offer("a", { hour: 3, pricePerAdult: 20_000_000, durationMinutes: 100 }),
    offer("b", {
      hour: 9,
      pricePerAdult: 40_000_000,
      airline: { code: "W5", nameFa: "ماهان", nameEn: "Mahan" },
      durationMinutes: 80,
    }),
    offer("c", { hour: 15, pricePerAdult: 30_000_000, flightType: "CHARTER" }),
    offer("d", { hour: 21, pricePerAdult: 10_000_000, durationMinutes: 60 }),
  ];

  it("buckets by origin wall-clock hour", () => {
    expect(offers.map(timeBucketOfOffer)).toEqual(["NIGHT", "MORNING", "AFTERNOON", "EVENING"]);
    expect(countByTimeBucket(offers)).toEqual({ NIGHT: 1, MORNING: 1, AFTERNOON: 1, EVENING: 1 });
  });

  it("keeps the API order for 'best' and does not mutate input", () => {
    const ids = applyFilters(offers, EMPTY_FILTERS).map((o) => o.id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("sorts by price, duration and departure", () => {
    expect(applyFilters(offers, { ...EMPTY_FILTERS, sort: "price" }).map((o) => o.id)).toEqual([
      "d",
      "a",
      "c",
      "b",
    ]);
    expect(applyFilters(offers, { ...EMPTY_FILTERS, sort: "duration" }).map((o) => o.id)).toEqual([
      "d",
      "b",
      "c",
      "a",
    ]);
    expect(applyFilters(offers, { ...EMPTY_FILTERS, sort: "departure" }).map((o) => o.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(offers.map((o) => o.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("combines filters with AND across groups and OR within one", () => {
    const result = applyFilters(offers, {
      ...EMPTY_FILTERS,
      airlines: ["IR"],
      times: ["NIGHT", "EVENING"],
    });
    expect(result.map((o) => o.id)).toEqual(["a", "d"]);
    expect(applyFilters(offers, { ...EMPTY_FILTERS, type: "CHARTER" }).map((o) => o.id)).toEqual([
      "c",
    ]);
    expect(
      applyFilters(offers, { ...EMPTY_FILTERS, maxPrice: 20_000_000 }).map((o) => o.id),
    ).toEqual(["a", "d"]);
  });

  it("counts active filter groups", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, airlines: ["IR", "W5"], maxPrice: 1 })).toBe(2);
  });
});
