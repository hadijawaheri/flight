import { describe, expect, it } from "vitest";

import { fareMatrixQuerySchema, flightSearchQuerySchema } from "./flights.schema";

describe("flightSearchQuerySchema", () => {
  it("validates a standard search query with defaults", () => {
    const query = {
      origin: "THR",
      destination: "MHD",
      departureDate: "2026-10-15",
    };
    const result = flightSearchQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adults).toBe(1);
      expect(result.data.children).toBe(0);
      expect(result.data.sortBy).toBe("price_asc");
    }
  });

  it("coerces string numbers to numbers", () => {
    const query = {
      origin: "THR",
      destination: "KIH",
      departureDate: "2026-10-20",
      adults: "2",
      children: "1",
    };
    const result = flightSearchQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adults).toBe(2);
      expect(result.data.children).toBe(1);
    }
  });

  it("rejects invalid departure date format", () => {
    const query = {
      origin: "THR",
      destination: "MHD",
      departureDate: "15-10-2026",
    };
    const result = flightSearchQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

describe("fareMatrixQuerySchema", () => {
  it("validates fare matrix query", () => {
    const query = {
      origin: "THR",
      destination: "MHD",
      startDate: "2026-10-10",
      days: "7",
    };
    const result = fareMatrixQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(7);
    }
  });
});
