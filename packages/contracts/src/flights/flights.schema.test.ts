import { describe, expect, it } from "vitest";

import { searchFlightsQuerySchema } from "./flights.schema";

describe("searchFlightsQuerySchema", () => {
  const base = { origin: "THR", destination: "MHD", date: "2026-10-15" };

  it("applies defaults and coerces query-string numbers", () => {
    const parsed = searchFlightsQuerySchema.parse({ ...base, adults: "2", children: "1" });
    expect(parsed.adults).toBe(2);
    expect(parsed.children).toBe(1);
    expect(parsed.infants).toBe(0);
    expect(parsed.sort).toBe("best");
    expect(parsed.cabin).toBe("ECONOMY");
  });

  it("rejects a malformed date, identical endpoints and too many infants", () => {
    expect(searchFlightsQuerySchema.safeParse({ ...base, date: "15-10-2026" }).success).toBe(false);
    expect(searchFlightsQuerySchema.safeParse({ ...base, destination: "THR" }).success).toBe(false);
    expect(searchFlightsQuerySchema.safeParse({ ...base, adults: 1, infants: 2 }).success).toBe(
      false,
    );
  });
});
