import { describe, expect, it } from "vitest";

import {
  AIRCRAFT,
  fitsSector,
  getAircraft,
  requireAircraft,
  totalSeats,
  WIDE_BODY_MIN_KM,
} from "./aircraft";
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
import {
  airportServes,
  airportsServing,
  destinationsFrom,
  getRoute,
  routeKindBetween,
  routeProblem,
  routesFrom,
} from "./routes";

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
    expect(searchAirports("جده")[0]?.code).toBe("JED");
    expect(searchAirports("مدینه")[0]?.code).toBe("MED");
    expect(searchAirports("مسکو")[0]?.code).toBe("SVO");
    expect(searchAirports("petersburg")[0]?.code).toBe("LED");
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
      for (const code of [
        ...airline.bases,
        ...(airline.destinations ?? []),
        ...(airline.gateways ?? []),
      ]) {
        if (code !== "*") expect(getAirport(code)).toBeDefined();
      }
      // gateways narrow where a foreign carrier lands in Iran; an Iranian carrier uses bases instead
      if (airline.gateways) {
        expect(airline.kind).toBe("FOREIGN");
        for (const code of airline.gateways) expect(getAirport(code)?.countryCode).toBe("IR");
      }
    }
  });

  it("send only Iranian carriers to the pilgrim and Russian destinations", () => {
    for (const code of ["JED", "MED", "SVO", "LED"]) {
      const carriers = AIRLINES.filter((airline) => airline.destinations?.includes(code));
      expect(carriers.length, code).toBeGreaterThan(0);
      expect(
        carriers.every((airline) => airline.kind === "IRANIAN"),
        code,
      ).toBe(true);
    }
  });

  it("keeps wide-bodies off short sectors and small types off long ones", () => {
    const wide = AIRCRAFT.filter((aircraft) => aircraft.wideBody);
    expect(wide.map((aircraft) => aircraft.id).sort()).toEqual(["A330", "B777"]);
    for (const aircraft of wide) {
      expect(aircraft.minSectorKm).toBeGreaterThanOrEqual(WIDE_BODY_MIN_KM);
      expect(fitsSector(aircraft, 240)).toBe(false);
    }
    for (const aircraft of AIRCRAFT.filter((candidate) => !candidate.wideBody)) {
      expect(fitsSector(aircraft, 200), aircraft.id).toBe(true);
      expect(aircraft.minSectorKm).toBe(0);
    }
    expect(fitsSector(requireAircraft("A330"), 1900)).toBe(true);
    expect(fitsSector(requireAircraft("ATR72"), 1500)).toBe(false);
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

describe("what each airport offers", () => {
  it("keeps the airport flag and the route network in step", () => {
    for (const airport of AIRPORTS) {
      expect(airportServes(airport.code, "INTERNATIONAL"), airport.code).toBe(
        airport.international,
      );
    }
  });

  it("gives Imam Khomeini international routes only", () => {
    expect(airportServes("IKA", "DOMESTIC")).toBe(false);
    expect(destinationsFrom("IKA", "DOMESTIC")).toEqual([]);
    expect(destinationsFrom("IKA", "INTERNATIONAL")).toContain("IST");
    expect(routeKindBetween("IKA", "MHD")).toBeNull();
    expect(routeProblem("IKA", "MHD")).toContain("فقط پرواز خارجی");
    expect(routeProblem("MHD", "IKA")).toContain("فقط پرواز خارجی");
  });

  it("never mixes kinds: a domestic list has no foreign airport and the reverse", () => {
    for (const airport of AIRPORTS) {
      for (const code of destinationsFrom(airport.code, "DOMESTIC")) {
        expect(getAirport(code)?.countryCode, `${airport.code}-${code}`).toBe("IR");
      }
      for (const code of destinationsFrom(airport.code, "INTERNATIONAL")) {
        const pair = [airport.countryCode, getAirport(code)?.countryCode];
        expect(
          pair.filter((country) => country === "IR"),
          `${airport.code}-${code}`,
        ).toHaveLength(1);
      }
    }
  });

  it("is symmetric: if A reaches B then B reaches A", () => {
    for (const airport of AIRPORTS) {
      for (const code of destinationsFrom(airport.code)) {
        expect(destinationsFrom(code), `${airport.code}-${code}`).toContain(airport.code);
      }
    }
  });

  it("serves the Tehran group through either of its airports", () => {
    expect(routeKindBetween("TEH", "MHD")).toBe("DOMESTIC");
    expect(routeKindBetween("TEH", "DXB")).toBe("INTERNATIONAL");
    expect(destinationsFrom("TEH", "DOMESTIC")).toContain("MHD");
    expect(destinationsFrom("TEH", "INTERNATIONAL")).toContain("DXB");
  });

  it("lists origins per kind and explains a missing route", () => {
    expect(airportsServing("DOMESTIC").map((a) => a.code)).not.toContain("IKA");
    expect(airportsServing("DOMESTIC").map((a) => a.code)).not.toContain("DXB");
    expect(airportsServing("INTERNATIONAL").map((a) => a.code)).toContain("DXB");
    expect(routeProblem("THR", "MHD")).toBeNull();
    expect(routeProblem("BUZ", "DXB")).toContain("پرواز خارجی نداریم");
    expect(routeProblem("KER", "DXB")).toContain("پرواز مستقیم نداریم");
    expect(routeProblem("DXB", "IST")).toContain("از و به ایران");
    expect(routeProblem("KER", "RAS")).toContain("پرواز مستقیم");
  });

  it("flies abroad from the regional airports that really do", () => {
    for (const code of ["RAS", "OMH", "AZD", "KER", "GSM"]) {
      expect(airportServes(code, "INTERNATIONAL"), code).toBe(true);
    }
    expect(destinationsFrom("OMH", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["IST", "ESB"]),
    );
    expect(destinationsFrom("RAS", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["IST", "GYD", "NJF"]),
    );
    expect(destinationsFrom("GSM", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["DXB", "SHJ"]),
    );
    expect(destinationsFrom("AZD", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["NJF", "BGW"]),
    );
    expect(destinationsFrom("KER", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["NJF", "BGW"]),
    );
    // a small airport without any foreign route stays domestic-only
    expect(airportServes("BUZ", "INTERNATIONAL")).toBe(false);
  });

  it("links the gateways to Hajj, Umrah and Russia", () => {
    expect(destinationsFrom("IKA", "INTERNATIONAL")).toEqual(
      expect.arrayContaining(["JED", "MED", "SVO", "LED"]),
    );
    for (const gateway of ["MHD", "SYZ", "IFN", "TBZ", "KER"]) {
      expect(getRoute(gateway, "JED"), gateway).toBeDefined();
      expect(getRoute("JED", gateway), gateway).toBeDefined();
    }
    expect(getRoute("MHD", "SVO")).toBeDefined();
    expect(getAirport("JED")?.countryFa).toBe("عربستان");
    expect(getAirport("SVO")?.countryFa).toBe("روسیه");
    // no foreign-foreign shortcut between the new airports
    expect(getRoute("JED", "SVO")).toBeUndefined();
    expect(getRoute("JED", "DXB")).toBeUndefined();
  });

  it("does not schedule Kish–Doha, and flies Tbilisi from Tabriz and the Saudi routes as charters only", () => {
    expect(getRoute("KIH", "DOH")).toBeUndefined();
    expect(getRoute("DOH", "KIH")).toBeUndefined();
    expect(routeKindBetween("KIH", "DOH")).toBeNull();
    for (const [from, to] of [
      ["TBZ", "TBS"],
      ["TBS", "TBZ"],
      ["IKA", "JED"],
      ["MED", "MHD"],
      ["IKA", "LED"],
    ] as const) {
      expect(getRoute(from, to)?.charterOnly, `${from}-${to}`).toBe(true);
    }
    expect(getRoute("IKA", "TBS")?.charterOnly).toBeUndefined();
    expect(getRoute("IKA", "SVO")?.charterOnly).toBeUndefined();
    expect(getRoute("IKA", "IST")?.charterOnly).toBeUndefined();
  });

  it("keeps Tehran's product rules: Imam Khomeini abroad only, Mehrabad only Najaf, Baghdad, Sabiha", () => {
    expect(destinationsFrom("IKA", "DOMESTIC")).toEqual([]);
    expect(destinationsFrom("THR", "INTERNATIONAL").sort()).toEqual(["BGW", "NJF", "SAW"]);
  });

  it("gives secondary airports fewer foreign frequencies than the gateway", () => {
    for (const airport of AIRPORTS.filter((a) => a.countryCode === "IR" && a.code !== "IKA")) {
      for (const code of destinationsFrom(airport.code, "INTERNATIONAL")) {
        const own = getRoute(airport.code, code);
        const gateway = getRoute("IKA", code);
        expect(gateway, `IKA-${code}`).toBeDefined();
        expect(own?.flightsPerDay, `${airport.code}-${code}`).toBeLessThanOrEqual(
          gateway?.flightsPerDay ?? 0,
        );
        expect(own?.flightsPerDay, `${airport.code}-${code}`).toBeLessThanOrEqual(3);
      }
    }
    expect(getRoute("IFN", "BGW")?.flightsPerDay).toBe(1);
    expect(getRoute("AWZ", "KWI")?.flightsPerDay).toBe(1);
    expect(getRoute("IKA", "IST")?.flightsPerDay).toBeGreaterThanOrEqual(8);
  });

  it("only offers the allowed airports in autocomplete", () => {
    const hits = searchAirports("", 50, ["THR", "MHD"]).map((hit) => hit.code);
    expect(hits.sort()).toEqual(["MHD", "TEH", "THR"].sort());
    expect(searchAirports("تهران", 10, ["IKA"]).map((hit) => hit.code)).toContain("TEH");
  });
});
