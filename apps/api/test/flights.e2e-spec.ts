import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { createTestApp, firstOffer, futureDate } from "./helpers.js";

describe("flights (e2e)", () => {
  let app: NestExpressApplication;
  const date = futureDate(21);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const search = (query: Record<string, string | number>) =>
    request(app.getHttpServer()).get("/v1/flights/search").query(query);

  it("searches a route anonymously and returns priced offers with an insight", async () => {
    const res = await search({ origin: "THR", destination: "MHD", date }).expect(200);
    const { offers, summary } = res.body.data;
    expect(offers.length).toBeGreaterThan(0);
    expect(summary.count).toBe(offers.length);
    expect(offers[0]).toMatchObject({
      pricePerAdult: expect.any(Number),
      seatsLeft: expect.any(Number),
      insight: { advice: expect.stringMatching(/BUY_NOW|WAIT/) },
    });
  });

  it("sorts by price when asked", async () => {
    const res = await search({ origin: "THR", destination: "MHD", date, sort: "price" }).expect(
      200,
    );
    const prices: number[] = res.body.data.offers.map(
      (offer: { pricePerAdult: number }) => offer.pricePerAdult,
    );
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("filters by maximum price", async () => {
    const all = await search({ origin: "THR", destination: "MHD", date, sort: "price" }).expect(
      200,
    );
    const cap = all.body.data.offers[0].pricePerAdult as number;
    const res = await search({ origin: "THR", destination: "MHD", date, maxPrice: cap }).expect(
      200,
    );
    for (const offer of res.body.data.offers) expect(offer.pricePerAdult).toBeLessThanOrEqual(cap);
  });

  it("rejects the same origin and destination and more infants than adults", async () => {
    const same = await search({ origin: "THR", destination: "THR", date }).expect(400);
    expect(same.body.code).toBe("VALIDATION_FAILED");
    await search({ origin: "THR", destination: "MHD", date, adults: 1, infants: 2 }).expect(400);
  });

  it("returns the offer, seat map, price analysis and a fare calendar for one flight", async () => {
    const offer = await firstOffer(app, { origin: "THR", destination: "MHD", date });
    const server = app.getHttpServer();

    const detail = await request(server)
      .get(`/v1/flights/${offer.id}`)
      .query({ adults: 2 })
      .expect(200);
    expect(detail.body.data.fare.total).toBeGreaterThan(offer.pricePerAdult);

    const seats = await request(server).get(`/v1/flights/${offer.id}/seats`).expect(200);
    expect(seats.body.data.rows.length).toBeGreaterThan(10);

    const analysis = await request(server)
      .get(`/v1/flights/${offer.id}/price-analysis`)
      .expect(200);
    expect(analysis.body.data.history.length).toBeGreaterThan(7);
    expect(analysis.body.data.forecast.length).toBeGreaterThan(0);
    expect(analysis.body.data.insight.confidence).toBeGreaterThanOrEqual(0.3);

    const calendar = await request(server)
      .get("/v1/flights/calendar")
      .query({ origin: "THR", destination: "MHD", days: 14 })
      .expect(200);
    expect(calendar.body.data.days).toHaveLength(14);
  });

  it("answers 404 for an unknown flight id and 400 for a malformed one", async () => {
    await request(app.getHttpServer()).get("/v1/flights/THRMHD20261020XX99E").expect(404);
    await request(app.getHttpServer()).get("/v1/flights/not-a-flight").expect(400);
  });

  it("serves the cheapest-deals endpoints", async () => {
    const server = app.getHttpServer();
    await request(server).get("/v1/deals/flash").expect(200);
    const explore = await request(server)
      .get("/v1/deals/explore")
      .query({ origin: "THR", budget: 100_000_000 })
      .expect(200);
    expect(Array.isArray(explore.body.data.destinations)).toBe(true);
  });
});
