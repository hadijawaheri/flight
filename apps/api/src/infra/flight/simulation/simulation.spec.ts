import {
  addDaysIso,
  AIRPORTS,
  buildFlightId,
  diffDaysIso,
  fitsSector,
  getAirport,
  getRoute,
  parseFlightId,
  WIDE_BODY_MIN_KM,
} from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import { FixedClock } from "../../../common/clock/clock.js";
import { SimulatedFlightProvider } from "../simulated-flight.provider.js";
import { bookingCurve, fareAt, loadFactorAt } from "./pricing-model.js";
import { findScheduled, operatorsFor, scheduleFor, suitableAircraft } from "./schedule.js";

const clock = new FixedClock(new Date("2026-10-05T08:00:00Z"));
const provider = new SimulatedFlightProvider(clock);
const TODAY = clock.today();

describe("schedule", () => {
  it("is deterministic", () => {
    expect(scheduleFor("THR", "MHD", "2026-10-20")).toEqual(
      scheduleFor("THR", "MHD", "2026-10-20"),
    );
  });

  it("serves the main hub routes with several departures, ordered by time", () => {
    const flights = scheduleFor("THR", "MHD", "2026-10-20");
    expect(flights.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < flights.length; index += 1) {
      expect(flights[index]!.departureMinutes).toBeGreaterThanOrEqual(
        flights[index - 1]!.departureMinutes,
      );
    }
  });

  it("keeps the same flight number and time every day (only some weekdays may be skipped)", () => {
    const monday = scheduleFor("THR", "SYZ", "2026-10-19");
    const tuesday = scheduleFor("THR", "SYZ", "2026-10-20");
    const first = monday.find((flight) => flight.key.slot === 0);
    const again = tuesday.find((flight) => flight.key.slot === 0);
    expect(first?.flightNumber).toBe(again?.flightNumber);
    expect(first?.departureMinutes).toBe(again?.departureMinutes);
  });

  it("only uses airlines that actually serve the route", () => {
    for (const flight of scheduleFor("IKA", "IST", "2026-10-20")) {
      expect(operatorsFor(flight.route).map((airline) => airline.code)).toContain(
        flight.airline.code,
      );
    }
  });

  it("computes arrival from the block time with the right time zones", () => {
    const flight = scheduleFor("IKA", "DXB", "2026-10-20")[0]!;
    expect(flight.arrivalUtc.getTime() - flight.departureUtc.getTime()).toBe(
      flight.blockMinutes * 60_000,
    );
    expect(flight.blockMinutes).toBeGreaterThan(60);
    expect(flight.blockMinutes).toBeLessThan(200);
  });

  it("finds a flight again from its key and rejects a wrong airline or slot", () => {
    const flight = scheduleFor("THR", "MHD", "2026-10-20")[0]!;
    expect(findScheduled(flight.key)?.flightNumber).toBe(flight.flightNumber);
    expect(
      findScheduled({ ...flight.key, airlineCode: flight.airline.code === "IR" ? "W5" : "IR" }),
    ).toBeNull();
    expect(findScheduled({ ...flight.key, slot: 99 })).toBeNull();
  });

  it("returns nothing where no route exists", () => {
    expect(scheduleFor("IST", "DXB", "2026-10-20")).toEqual([]);
    expect(scheduleFor("KER", "ZAH", "2026-10-20")).toEqual([]);
  });

  it("gives every route in the network at least one operator", () => {
    for (const a of AIRPORTS) {
      for (const b of AIRPORTS) {
        const route = getRoute(a.code, b.code);
        if (route) expect(operatorsFor(route).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("aircraft and operators", () => {
  const routes = AIRPORTS.flatMap((a) =>
    AIRPORTS.flatMap((b) => {
      const route = getRoute(a.code, b.code);
      return route ? [route] : [];
    }),
  );
  const dates = Array.from({ length: 7 }, (_, offset) => addDaysIso("2026-10-20", offset));

  it("never schedules a wide-body below the minimum sector, on any route", () => {
    expect(routes.length).toBeGreaterThan(200);
    for (const route of routes) {
      for (const airline of operatorsFor(route)) {
        const pool = suitableAircraft(airline, route);
        expect(pool.length, `${airline.code} ${route.origin}-${route.destination}`).toBeGreaterThan(
          0,
        );
        for (const aircraft of pool) {
          if (route.distanceKm < WIDE_BODY_MIN_KM) expect(aircraft.wideBody).toBe(false);
        }
      }
      for (const date of dates) {
        for (const flight of scheduleFor(route.origin, route.destination, date)) {
          const where = `${flight.flightNumber} ${route.origin}-${route.destination}`;
          expect(fitsSector(flight.aircraft, route.distanceKm), where).toBe(true);
          if (flight.aircraft.wideBody) {
            expect(route.distanceKm, where).toBeGreaterThanOrEqual(WIDE_BODY_MIN_KM);
          }
        }
      }
    }
  });

  it("flies the Gulf hops with narrow-body or regional types", () => {
    for (const [a, b] of [
      ["KIH", "DXB"],
      ["BND", "DXB"],
      ["GSM", "DXB"],
      ["AWZ", "KWI"],
      ["AWZ", "DXB"],
      ["MHD", "NJF"],
    ] as const) {
      const flights = dates.flatMap((date) => scheduleFor(a, b, date));
      expect(flights.length, `${a}-${b}`).toBeGreaterThan(0);
      for (const flight of flights) expect(flight.aircraft.wideBody, `${a}-${b}`).toBe(false);
    }
  });

  it("keeps the long routes sensible: pilgrim and Russian flights are Iranian and fit the sector", () => {
    for (const [a, b] of [
      ["IKA", "JED"],
      ["IKA", "MED"],
      ["IKA", "SVO"],
      ["MHD", "SVO"],
      ["IKA", "LED"],
      ["KER", "JED"],
    ] as const) {
      const flights = dates.flatMap((date) => scheduleFor(a, b, date));
      expect(flights.length, `${a}-${b}`).toBeGreaterThan(0);
      for (const flight of flights) {
        expect(flight.airline.kind, `${a}-${b}`).toBe("IRANIAN");
        expect(flight.aircraft.maxSectorKm, `${a}-${b}`).toBeGreaterThanOrEqual(
          flight.route.distanceKm,
        );
        expect(flight.blockMinutes).toBeGreaterThan(100);
      }
    }
  });

  it("restricts foreign carriers to the Iranian airports they actually fly to", () => {
    for (const route of routes.filter((candidate) => candidate.international)) {
      const iranian =
        getAirport(route.origin)?.countryCode === "IR" ? route.origin : route.destination;
      for (const airline of operatorsFor(route)) {
        if (airline.gateways)
          expect(airline.gateways, `${airline.code} ${iranian}`).toContain(iranian);
      }
    }
    // Pegasus and Turkish do not serve small airports such as Kerman or Ahvaz
    expect(operatorsFor(getRoute("AWZ", "DXB")!).map((airline) => airline.code)).not.toContain(
      "FZ",
    );
  });

  it("sells charter-only routes as charters and leaves scheduled international flights systemic", () => {
    for (const [a, b] of [
      ["TBZ", "TBS"],
      ["IKA", "JED"],
      ["MED", "SYZ"],
    ] as const) {
      const flights = dates.flatMap((date) => scheduleFor(a, b, date));
      expect(flights.length, `${a}-${b}`).toBeGreaterThan(0);
      for (const flight of flights) expect(flight.flightType, `${a}-${b}`).toBe("CHARTER");
    }
    for (const flight of dates.flatMap((date) => scheduleFor("IKA", "IST", date))) {
      expect(flight.flightType).toBe("SYSTEMIC");
    }
  });

  it("flies no Kish–Doha service", () => {
    expect(scheduleFor("KIH", "DOH", "2026-10-20")).toEqual([]);
    expect(scheduleFor("DOH", "KIH", "2026-10-20")).toEqual([]);
  });
});

describe("pricing model", () => {
  it("rises towards departure", () => {
    expect(bookingCurve(60)).toBeLessThan(bookingCurve(30));
    expect(bookingCurve(30)).toBeLessThan(bookingCurve(7));
    expect(bookingCurve(7)).toBeLessThan(bookingCurve(1));
    expect(bookingCurve(400)).toBeCloseTo(0.9, 2);
  });

  it("charges more for business than economy on the same flight", () => {
    const flight = scheduleFor("IKA", "IST", "2026-11-20").find(
      (candidate) => candidate.airline.hasBusiness,
    )!;
    expect(fareAt(flight, "BUSINESS", TODAY)).toBeGreaterThan(fareAt(flight, "ECONOMY", TODAY) * 2);
  });

  it("is deterministic and rounded to 10,000 rial", () => {
    const flight = scheduleFor("THR", "MHD", "2026-11-20")[0]!;
    const price = fareAt(flight, "ECONOMY", TODAY);
    expect(fareAt(flight, "ECONOMY", TODAY)).toBe(price);
    expect(price % 10_000).toBe(0);
    expect(price).toBeGreaterThan(10_000_000);
  });

  it("fills up as departure approaches and faster on peak days", () => {
    const flight = scheduleFor("THR", "MHD", "2026-11-20")[0]!;
    expect(loadFactorAt(flight, "ECONOMY", 5)).toBeGreaterThan(loadFactorAt(flight, "ECONOMY", 40));
    for (let days = 0; days <= 100; days += 5) {
      const load = loadFactorAt(flight, "ECONOMY", days);
      expect(load).toBeGreaterThanOrEqual(0.05);
      expect(load).toBeLessThanOrEqual(0.98);
    }
  });

  it("makes Nowruz more expensive than an ordinary day", () => {
    const nowruz = scheduleFor("THR", "MHD", "2027-03-23")[0]!;
    const ordinary = scheduleFor("THR", "MHD", "2027-01-12")[0]!;
    expect(fareAt(nowruz, "ECONOMY", "2027-03-01", { expected: true })).toBeGreaterThan(
      fareAt(ordinary, "ECONOMY", "2027-01-01", { expected: true }),
    );
  });
});

describe("simulated provider", () => {
  it("searches both Tehran airports through the group code", async () => {
    const records = await provider.search({
      origins: ["TEH"],
      destinations: ["MHD"],
      date: "2026-10-20",
      cabin: "ECONOMY",
    });
    expect(records.length).toBeGreaterThan(0);
    expect(new Set(records.map((record) => record.origin.code))).toEqual(new Set(["THR"]));
  });

  it("round-trips ids through find()", async () => {
    const [record] = await provider.search({
      origins: ["THR"],
      destinations: ["SYZ"],
      date: "2026-10-20",
      cabin: "ECONOMY",
    });
    const found = await provider.find(record!.id);
    expect(found?.id).toBe(record!.id);
    expect(found?.adultBaseFare).toBe(record!.adultBaseFare);
    expect(await provider.find("garbage")).toBeNull();
    const parsed = parseFlightId(record!.id)!;
    expect(await provider.find(buildFlightId({ ...parsed, slot: 77 }))).toBeNull();
  });

  it("does not offer business on aircraft without a business cabin", async () => {
    const records = await provider.search({
      origins: ["THR"],
      destinations: ["MHD"],
      date: "2026-10-20",
      cabin: "BUSINESS",
    });
    for (const record of records) {
      expect(record.airline.hasBusiness).toBe(true);
      expect(record.aircraft.businessRows).toBeGreaterThan(0);
    }
  });

  it("returns a history that ends today and a forecast that starts tomorrow", async () => {
    const [record] = await provider.search({
      origins: ["THR"],
      destinations: ["MHD"],
      date: addDaysIso(TODAY, 25),
      cabin: "ECONOMY",
    });
    const history = await provider.priceHistory(record!, 45);
    const forecast = await provider.priceForecast(record!, 14);
    expect(history[history.length - 1]?.date).toBe(TODAY);
    expect(history[history.length - 1]?.price).toBe(record!.adultBaseFare);
    expect(forecast[0]?.date).toBe(addDaysIso(TODAY, 1));
    expect(forecast).toHaveLength(14);
    expect(history.length).toBeGreaterThan(20);
  });

  it("limits history to the days a flight was on sale and never past departure", async () => {
    const [record] = await provider.search({
      origins: ["THR"],
      destinations: ["MHD"],
      date: addDaysIso(TODAY, 3),
      cabin: "ECONOMY",
    });
    const forecast = await provider.priceForecast(record!, 14);
    expect(forecast.length).toBe(3);
    const history = await provider.priceHistory(record!, 45);
    for (const point of history)
      expect(diffDaysIso(addDaysIso(TODAY, 3), point.date)).toBeGreaterThanOrEqual(0);
  });

  it("forecasts within a plausible band of the realised price", async () => {
    const records = await provider.search({
      origins: ["THR"],
      destinations: ["SYZ"],
      date: addDaysIso(TODAY, 40),
      cabin: "ECONOMY",
    });
    for (const record of records) {
      const [tomorrow] = await provider.priceForecast(record, 1);
      const actual = provider.fareOn(record, addDaysIso(TODAY, 1));
      expect(Math.abs(tomorrow!.price - actual) / actual).toBeLessThan(0.22);
    }
  });
});
