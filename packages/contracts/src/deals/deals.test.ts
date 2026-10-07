import { describe, expect, it } from "vitest";

import {
  bandOfTotal,
  TRIP_PARTIES,
  TRIP_PARTY_KEYS,
  TRIP_SCOPES,
  tripBands,
  tripIdeasQuerySchema,
} from "./deals.schema";

describe("trip parties", () => {
  it("covers one, two and four travellers", () => {
    const sizes = TRIP_PARTY_KEYS.map((key) => {
      const party = TRIP_PARTIES[key];
      return party.adults + party.children + party.infants;
    });
    expect(sizes).toEqual([1, 2, 4, 4]);
  });

  it("never books more infants than adults", () => {
    for (const key of TRIP_PARTY_KEYS) {
      const party = TRIP_PARTIES[key];
      expect(party.infants).toBeLessThanOrEqual(party.adults);
    }
  });
});

describe("trip budget bands", () => {
  it("rises with the party size, and abroad costs more than at home", () => {
    for (const scope of TRIP_SCOPES) {
      const limits = TRIP_PARTY_KEYS.map((key) => tripBands(key, scope)[0]?.maxToman ?? 0);
      expect(limits).toEqual([...limits].sort((a, b) => a - b));
    }
    for (const key of TRIP_PARTY_KEYS) {
      expect(tripBands(key, "international")[0]?.maxToman ?? 0).toBeGreaterThan(
        tripBands(key, "domestic")[0]?.maxToman ?? 0,
      );
    }
  });

  it("tiles the whole range with no gap and no overlap", () => {
    for (const key of TRIP_PARTY_KEYS) {
      for (const scope of TRIP_SCOPES) {
        const [saver, balanced, relaxed] = tripBands(key, scope);
        expect(saver?.minToman).toBe(0);
        expect(saver?.maxToman).toBe(balanced?.minToman);
        expect(balanced?.maxToman).toBe(relaxed?.minToman);
        expect(relaxed?.maxToman).toBeNull();
      }
    }
  });

  it("puts a price on a boundary into the cheaper band", () => {
    const [saver] = tripBands("solo", "domestic");
    const edge = (saver?.maxToman ?? 0) * 10;
    expect(bandOfTotal(edge, "solo", "domestic")).toBe("saver");
    expect(bandOfTotal(edge + 10, "solo", "domestic")).toBe("balanced");
    expect(bandOfTotal(1, "solo", "domestic")).toBe("saver");
    expect(bandOfTotal(10_000_000_000, "solo", "domestic")).toBe("relaxed");
  });

  it("defaults the query to a domestic solo trip from Tehran", () => {
    expect(tripIdeasQuerySchema.parse({})).toMatchObject({
      origin: "TEH",
      party: "solo",
      scope: "domestic",
      days: 30,
    });
    expect(tripIdeasQuerySchema.safeParse({ party: "crowd" }).success).toBe(false);
  });
});
