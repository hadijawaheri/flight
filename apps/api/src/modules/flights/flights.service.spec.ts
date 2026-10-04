import { describe, expect, it } from "vitest";

import { MockFlightProvider } from "../../infra/flight/mock-flight.provider.js";
import { FlightsService } from "./flights.service.js";

describe("FlightsService", () => {
  const provider = new MockFlightProvider();
  const service = new FlightsService(provider);

  it("searches flights for a route and returns results", async () => {
    const today = new Date().toISOString().split("T")[0]!;
    const results = await service.search({
      origin: "THR",
      destination: "MHD",
      departureDate: today,
      adults: 1,
      children: 0,
      infants: 0,
      sortBy: "price_asc",
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.originCode).toBe("THR");
    expect(results[0]?.destinationCode).toBe("MHD");
    expect(results[0]?.pricePrediction).toBeDefined();
    expect(results[0]?.pricePrediction.advice).toBeDefined();
  });

  it("calculates a fare matrix for 7 days", async () => {
    const today = new Date().toISOString().split("T")[0]!;
    const matrix = await service.getFareMatrix("THR", "MHD", today, 7);

    expect(matrix).toHaveLength(7);
    expect(matrix[0]?.date).toBe(today);
    expect(matrix.some((m) => m.isLowestInWeek)).toBe(true);
  });
});
