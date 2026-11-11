import { requireAirport } from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import { FixedClock } from "../../common/clock/clock.js";
import type { FlightProvider, FlightRecord } from "../../infra/flight/flight.provider.js";
import { SimulatedHotelProvider } from "../../infra/hotel/simulated-hotel.provider.js";
import { SimulatedTransferProvider } from "../../infra/transfer/simulated-transfer.provider.js";
import type { BookingsService } from "../bookings/bookings.service.js";
import { TransfersService } from "./transfers.service.js";

const THR = requireAirport("THR");
const MHD = requireAirport("MHD");

// Departs Mashhad 23:50 on 1 Dec and lands in Tehran 01:30 on 2 Dec, local time
const nightFlight = {
  id: "MHDTHR20261201IR09E",
  departureUtc: new Date("2026-12-01T20:20:00.000Z"),
  arrivalUtc: new Date("2026-12-01T22:00:00.000Z"),
  international: false,
  origin: MHD,
  destination: THR,
} as unknown as FlightRecord;

function service(now = "2026-11-20T08:00:00Z") {
  const flights = {
    find: (id: string) => Promise.resolve(id === nightFlight.id ? nightFlight : null),
  } as unknown as FlightProvider;
  return new TransfersService(
    flights,
    new SimulatedHotelProvider(),
    new SimulatedTransferProvider(),
    {} as BookingsService,
    new FixedClock(new Date(now)),
  );
}

describe("TransfersService", () => {
  it("meets a 01:30 arrival on the next calendar day, after baggage claim", async () => {
    const quote = await service().quote(null, {
      flightId: nightFlight.id,
      direction: "FROM_AIRPORT",
      zoneId: "ZTHR1",
      passengers: 2,
      bags: 2,
    });
    const [first] = quote.offers;
    expect(first?.pickupLocalTime).toBe("2026-12-02T02:00");
    expect(first?.freeWaitingMinutes).toBe(60);
    expect(first?.pickupPlaceFa).toContain("سالن ورودی");
  });

  it("offers a van, not a sedan, for 5 people with 6 bags", async () => {
    const quote = await service().quote(null, {
      flightId: nightFlight.id,
      direction: "FROM_AIRPORT",
      zoneId: "ZTHR2",
      passengers: 5,
      bags: 6,
    });
    expect(quote.offers.map((offer) => offer.vehicle)).toEqual(["VAN"]);
  });

  it("charges a night pickup more than the same ride by day", async () => {
    const provider = new SimulatedTransferProvider();
    const zone = (await provider.findZone("ZTHR1"))!;
    const ride = { zone, direction: "FROM_AIRPORT" as const, passengers: 1, bags: 1 };
    const sedan = async (pickupAt: string) =>
      (await provider.rates({ ...ride, pickupAt: new Date(pickupAt) })).find(
        (rate) => rate.vehicle === "SEDAN",
      )!.price;
    // 02:00 and 14:00 Tehran time
    expect(await sedan("2026-12-01T22:30:00Z")).toBeGreaterThan(
      await sedan("2026-12-02T10:30:00Z"),
    );
  });

  it("takes the zone from a booked hotel and refuses a hotel in another city", async () => {
    const svc = service();
    const quote = await svc.quote(null, {
      flightId: nightFlight.id,
      direction: "FROM_AIRPORT",
      hotelId: "HTHR01",
      passengers: 1,
      bags: 1,
    });
    expect(quote.zone.airportCode).toBe("THR");
    expect(quote.offers[0]?.dropoffPlaceFa).toContain("هتل");

    await expect(
      svc.quote(null, {
        flightId: nightFlight.id,
        direction: "FROM_AIRPORT",
        hotelId: "HMHD01",
        passengers: 1,
        bags: 1,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("refuses a pickup that has already passed and a booking quote without sign-in", async () => {
    await expect(
      service("2026-12-02T00:00:00Z").quote(null, {
        flightId: nightFlight.id,
        direction: "FROM_AIRPORT",
        zoneId: "ZTHR1",
        passengers: 1,
        bags: 1,
      }),
    ).rejects.toMatchObject({ code: "FLIGHT_DEPARTED" });
    await expect(
      service().quote(null, {
        bookingId: "abc",
        direction: "FROM_AIRPORT",
        zoneId: "ZTHR1",
        passengers: 1,
        bags: 1,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
