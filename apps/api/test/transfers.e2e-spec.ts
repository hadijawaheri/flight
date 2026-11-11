import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { adultPassenger, createTestApp, firstOffer, futureDate, signedInAgent } from "./helpers.js";

describe("airport transfers (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("quotes rides from the airport for a flight, cheapest first, without sign-in", async () => {
    const offer = await firstOffer(app, {
      origin: "THR",
      destination: "MHD",
      date: futureDate(20),
    });
    const res = await request(app.getHttpServer())
      .get("/v1/transfers/quote")
      .query({
        flightId: offer.id,
        direction: "FROM_AIRPORT",
        zoneId: "ZMHD1",
        passengers: 2,
        bags: 3,
      })
      .expect(200);
    const quote = res.body.data;
    expect(quote).toMatchObject({
      airportCode: "MHD",
      direction: "FROM_AIRPORT",
      flightId: offer.id,
    });
    const prices = (quote.offers as Array<{ price: number }>).map((item) => item.price);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    // Arrival plus 30 minutes for bags on a domestic flight
    expect(Date.parse(quote.offers[0].pickupAt) - Date.parse(offer.arrivalUtc)).toBe(30 * 60_000);
  });

  it("quotes the ride to the airport for a booked trip, for its owner only", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, {
      origin: "THR",
      destination: "SYZ",
      date: futureDate(25),
    });
    const booking = await agent
      .post("/v1/bookings")
      .send({
        outboundFlightId: offer.id,
        passengers: [adultPassenger()],
        contact: { mobile: "09121234567" },
        quotedTotal: offer.fare.total,
      })
      .expect(201);
    const query = {
      bookingId: booking.body.data.id as string,
      direction: "TO_AIRPORT",
      zoneId: "ZTHR2",
      passengers: 1,
      bags: 1,
    };
    const res = await agent.get("/v1/transfers/quote").query(query).expect(200);
    // One-way trip: the ride catches the outbound flight from Tehran
    expect(res.body.data.airportCode).toBe("THR");
    expect(Date.parse(res.body.data.offers[0].pickupAt)).toBeLessThan(
      Date.parse(offer.departureUtc),
    );

    await request(app.getHttpServer()).get("/v1/transfers/quote").query(query).expect(401);
    await (await signedInAgent(app)).get("/v1/transfers/quote").query(query).expect(404);
  });

  it("validates the request", async () => {
    await request(app.getHttpServer())
      .get("/v1/transfers/quote")
      .query({ direction: "FROM_AIRPORT", zoneId: "ZMHD1" })
      .expect(400);
    await request(app.getHttpServer())
      .get("/v1/transfers/quote")
      .query({ flightId: "NOPE", direction: "FROM_AIRPORT", zoneId: "ZMHD1" })
      .expect(404);
  });
});
