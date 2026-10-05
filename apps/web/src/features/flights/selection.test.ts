import { describe, expect, it } from "vitest";

import type { TripQuery } from "../search/trip-query";
import { detailSearch, stepAfterSelecting } from "./selection";

const oneWay: TripQuery = {
  origin: "THR",
  destination: "MHD",
  date: "2026-10-20",
  adults: 2,
  children: 1,
  infants: 0,
  cabin: "ECONOMY",
};
const round: TripQuery = { ...oneWay, returnDate: "2026-10-25" };

describe("stepAfterSelecting", () => {
  it("sends a one-way trip to checkout with the party size", () => {
    const step = stepAfterSelecting(oneWay, null, "THRMHD20261020IR01Y");
    expect(step.next).toBe("checkout");
    const url = new URL(step.href, "http://x");
    expect(url.pathname).toBe("/checkout/new");
    expect(url.searchParams.get("outbound")).toBe("THRMHD20261020IR01Y");
    expect(url.searchParams.get("adults")).toBe("2");
    expect(url.searchParams.get("children")).toBe("1");
    expect(url.searchParams.has("infants")).toBe(false);
  });

  it("asks for the return flight first on a round trip", () => {
    const step = stepAfterSelecting(round, null, "OUT");
    expect(step.next).toBe("return");
    const url = new URL(step.href, "http://x");
    expect(url.pathname).toBe("/flights");
    expect(url.searchParams.get("out")).toBe("OUT");
    expect(url.searchParams.get("return")).toBe("2026-10-25");
  });

  it("checks out with both legs once the return is chosen", () => {
    const step = stepAfterSelecting(round, "OUT", "BACK");
    expect(step.next).toBe("checkout");
    const url = new URL(step.href, "http://x");
    expect(url.searchParams.get("outbound")).toBe("OUT");
    expect(url.searchParams.get("return")).toBe("BACK");
  });
});

describe("detailSearch", () => {
  it("carries the trip and the chosen outbound", () => {
    const params = new URLSearchParams(detailSearch(round, "OUT"));
    expect(params.get("origin")).toBe("THR");
    expect(params.get("out")).toBe("OUT");
  });
});
