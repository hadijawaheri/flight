import { describe, expect, it } from "vitest";

import { getAircraft, AIRCRAFT, totalSeats } from "./aircraft";
import { AIRLINES } from "./airlines";
import {
  AIRPORTS,
  distanceKm,
  expandAirportCode,
  getAirport,
  isKnownLocationCode,
  locationLabel,
  requireAirport,
  searchAirports,
} from "./airports";
import { demandForDate, officialHolidayName } from "./calendar";
import { getRoute, routesFrom } from "./routes";

describe("airports", () => {
  it("has unique IATA codes and sane coordinates and offsets", () => {
    const codes = AIRPORTS.map((airport) => airport.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const airport of AIRPORTS) {
      expect(airport.code).toMatch(/^[A-Z]{3}$/);
      expect(airport.lat).toBeGreaterThan(-90);
      expect(airport.lat).toBeLessThan(90);
      expect(airport.utcOffsetMinutes % 30).toBe(0);
    }
  });

  it("expands the Tehran group to both airports", () => {
    expect(expandAirportCode("TEH")).toEqual(["THR", "IKA"]);
    expect(expandAirportCode("mhd")).toEqual(["MHD"]);
    expect(expandAirportCode("ZZZ")).toEqual([]);
    expect(isKnownLocationCode("TEH")).toBe(true);
    expect(locationLabel("MHD")).toBe("مشهد");
  });

  it("measures realistic distances", () => {
    expect(distanceKm(requireAirport("THR"), requireAirport("MHD"))).toBeGreaterThan(700);
    expect(distanceKm(requireAirport("THR"), requireAirport("MHD"))).toBeLessThan(830);
    expect(distanceKm(requireAirport("THR"), requireAirport("THR"))).toBe(0);
  });

  it("autocompletes by Persian name, English name, code and Arabic letters", () => {
    expect(searchAirports("مشهد")[0]?.code).toBe("MHD");
    expect(searchAirports("shiraz")[0]?.code).toBe("SYZ");
    expect(searchAirports("kih")[0]?.code).toBe("KIH");
    expect(searchAirports("كيش")[0]?.code).toBe("KIH");
    expect(searchAirports("istan").map((hit) => hit.code)).toContain("IST");
    expect(searchAirports("zzzzzz")).toEqual([]);
  });

  it("offers sensible suggestions for an empty query", () => {
    const hits = searchAirports("", 6);
    expect(hits).toHaveLength(6);
  });
});

describe("airlines and aircraft", () => {
  it("only reference aircraft and airports that exist", () => {
    for (const airline of AIRLINES) {
      for (const id of airline.fleet) expect(getAircraft(id)).toBeDefined();
      for (const code of [...airline.bases, ...(airline.destinations ?? [])]) {
        if (code !== "*") expect(getAirport(code)).toBeDefined();
      }
    }
  });

  it("have unique two-character codes", () => {
    const codes = AIRLINES.map((airline) => airline.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[A-Z0-9]{2}$/);
  });

  it("describe consistent cabins", () => {
    for (const aircraft of AIRCRAFT) {
      expect(aircraft.businessRows).toBeLessThan(aircraft.rows);
      for (const row of aircraft.exitRows) expect(row).toBeGreaterThan(aircraft.businessRows);
      expect(totalSeats(aircraft)).toBeGreaterThan(40);
    }
  });
});

describe("routes", () => {
  it("exist for the main domestic pairs in both directions with symmetric distance", () => {
    for (const [a, b] of [
      ["THR", "MHD"],
      ["THR", "SYZ"],
      ["THR", "KIH"],
      ["MHD", "SYZ"],
    ] as const) {
      const forward = getRoute(a, b);
      const back = getRoute(b, a);
      expect(forward).toBeDefined();
      expect(back).toBeDefined();
      expect(forward?.distanceKm).toBe(back?.distanceKm);
      expect(forward?.international).toBe(false);
    }
  });

  it("flags international routes and prices them above domestic ones", () => {
    const abroad = getRoute("IKA", "IST");
    expect(abroad?.international).toBe(true);
    expect(abroad?.baseFareRial ?? 0).toBeGreaterThan(
      getRoute("THR", "MHD")?.baseFareRial ?? Infinity,
    );
  });

  it("has no route to itself and none between two foreign airports", () => {
    expect(getRoute("THR", "THR")).toBeUndefined();
    expect(getRoute("IST", "DXB")).toBeUndefined();
  });

  it("lists the destinations reachable from an airport", () => {
    const codes = AIRPORTS.map((airport) => airport.code);
    const routes = routesFrom("IKA", codes);
    expect(routes.length).toBeGreaterThan(5);
    expect(routes.every((route) => route.origin === "IKA")).toBe(true);
  });
});

describe("demand calendar", () => {
  it("prices Nowruz above an ordinary autumn day", () => {
    const nowruz = demandForDate("2027-03-22"); // 2 Farvardin 1406
    const autumn = demandForDate("2026-10-14");
    expect(nowruz.isPeak).toBe(true);
    expect(nowruz.multiplier).toBeGreaterThan(autumn.multiplier);
    expect(nowruz.reasons.length).toBeGreaterThan(0);
  });

  it("names fixed holidays", () => {
    expect(officialHolidayName("2027-03-21")).toBe("نوروز");
    expect(officialHolidayName("2027-02-11")).toBe("پیروزی انقلاب اسلامی");
    expect(officialHolidayName("2026-10-14")).toBeNull();
  });

  it("keeps the multiplier in a sane band for a full year", () => {
    for (let offset = 0; offset < 365; offset += 1) {
      const date = new Date(Date.UTC(2026, 9, 1) + offset * 86_400_000).toISOString().slice(0, 10);
      const { multiplier } = demandForDate(date);
      expect(multiplier).toBeGreaterThan(0.8);
      expect(multiplier).toBeLessThan(1.8);
    }
  });
});
