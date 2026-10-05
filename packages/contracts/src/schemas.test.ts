import { describe, expect, it } from "vitest";

import * as contracts from "./index";

describe("contracts barrel", () => {
  it("exports the schemas the apps depend on", () => {
    expect(contracts.searchFlightsQuerySchema).toBeDefined();
    expect(contracts.createBookingSchema).toBeDefined();
    expect(contracts.createPassengerSchema).toBeDefined();
    expect(typeof contracts.analyzePrice).toBe("function");
  });
});
