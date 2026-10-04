import { describe, expect, it } from "vitest";

import { MockFlightProvider } from "../../infra/flight/mock-flight.provider.js";
import { DealsService } from "./deals.service.js";

describe("DealsService", () => {
  const provider = new MockFlightProvider();
  const service = new DealsService(provider);

  it("returns cheap deals with discount percent and remaining seats", async () => {
    const deals = await service.getDeals();
    expect(deals.length).toBeGreaterThan(0);
    expect(deals[0]?.discountPercent).toBeGreaterThan(0);
    expect(deals[0]?.dealPrice).toBeLessThan(deals[0]!.regularPrice);
    expect(deals[0]?.badge).toBeDefined();
  });

  it("returns budget destinations within max budget", async () => {
    const destinations = await service.exploreBudget("THR", 25_000_000);
    expect(Array.isArray(destinations)).toBe(true);
    for (const d of destinations) {
      expect(d.minPrice).toBeLessThanOrEqual(25_000_000);
    }
  });
});
