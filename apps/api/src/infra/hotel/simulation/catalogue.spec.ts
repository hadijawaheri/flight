import { describe, expect, it } from "vitest";

import { findHotel, hotelCityFor, hotelsInCity, rateRecord, roomPlans } from "./catalogue.js";

describe("simulated hotel catalogue", () => {
  it("rebuilds the same hotel and prices from its id", () => {
    const tehran = hotelCityFor("IKA");
    expect(tehran?.code).toBe("THR");
    const [first] = hotelsInCity(tehran!);
    expect(findHotel(first!.id)).toEqual(first);
    const plan = roomPlans(first!)[0]!;
    expect(rateRecord(first!, plan, "2026-12-01", "2026-12-03")).toEqual(
      rateRecord(first!, plan, "2026-12-01", "2026-12-03"),
    );
  });

  it("has no hotels abroad and rejects ids outside the city's range", () => {
    expect(hotelCityFor("IST")).toBeNull();
    expect(findHotel("HMHD99")).toBeNull();
    expect(findHotel("nonsense")).toBeNull();
  });

  it("prices every night of the stay, rounded to 10,000 toman", () => {
    const hotel = findHotel("HMHD01")!;
    const rate = rateRecord(hotel, roomPlans(hotel)[0]!, "2026-12-01", "2026-12-04");
    expect(rate.nightlyRates.map((night) => night.date)).toEqual([
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
    ]);
    for (const night of rate.nightlyRates) expect(night.amount % 100_000).toBe(0);
  });
});
