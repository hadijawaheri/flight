import { addDaysIso, tehranToday } from "@flysmart/contracts";
import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Connection } from "mongoose";
import request from "supertest";

import { createTestApp, firstOffer, futureDate } from "./helpers.js";

interface PricePoint {
  date: string;
  price: number;
}

describe("observed price history (e2e)", () => {
  let app: NestExpressApplication;
  let connection: Connection;
  const route = { origin: "THR", destination: "MHD", date: futureDate(25) };

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get(getConnectionToken());
  });
  afterAll(async () => {
    await app.close();
  });

  const observations = () => connection.collection("price_observations");

  it("records each open flight a search sees, once per day", async () => {
    const offer = await firstOffer(app, route);
    const today = tehranToday();

    const row = await observations().findOne({ flightId: offer.id, observedOn: today });
    expect(row).toMatchObject({
      source: "simulation",
      origin: "THR",
      destination: "MHD",
      departureDate: route.date,
      adultBaseFare: expect.any(Number),
      seatsLeft: offer.seatsLeft,
      samples: 1,
    });
    expect(row?.minFare).toBe(row?.adultBaseFare);
    expect(row?.maxFare).toBe(row?.adultBaseFare);
    expect(row?.daysToDeparture).toBe(25);

    // The same fare seen again right away is not rewritten
    await firstOffer(app, route);
    expect(await observations().countDocuments({ flightId: offer.id })).toBe(1);
    expect((await observations().findOne({ flightId: offer.id }))?.samples).toBe(1);
  });

  it("lets observed days override the model in the price analysis", async () => {
    const offer = await firstOffer(app, route);
    const server = app.getHttpServer();
    const before = await request(server).get(`/v1/flights/${offer.id}/price-analysis`).expect(200);
    const history = before.body.data.history as PricePoint[];
    const target = history[history.length - 4] as PricePoint;
    const today = tehranToday();
    expect(target.date < today).toBe(true);

    const { _id: seenId, ...seen } =
      (await observations().findOne({ flightId: offer.id, observedOn: today })) ?? {};
    expect(seenId).toBeDefined();
    await observations().insertOne({
      ...seen,
      observedOn: target.date,
      adultBaseFare: 100_000,
      minFare: 100_000,
      maxFare: 100_000,
    });

    const after = await request(server).get(`/v1/flights/${offer.id}/price-analysis`).expect(200);
    const merged = after.body.data.history as PricePoint[];
    expect(merged).toHaveLength(history.length);
    const changed = merged.find((point) => point.date === target.date) as PricePoint;
    expect(changed.price).toBeLessThan(target.price);
    // Every other day keeps its value
    expect(merged.filter((point) => point.date !== target.date)).toEqual(
      history.filter((point) => point.date !== target.date),
    );
    // A much cheaper past day now counts in the verdict's statistics
    expect(after.body.data.insight.stats.min).toBeLessThan(before.body.data.insight.stats.min);
  });

  it("ignores observations from another price source", async () => {
    const offer = await firstOffer(app, { ...route, date: futureDate(26) });
    const server = app.getHttpServer();
    const before = await request(server).get(`/v1/flights/${offer.id}/price-analysis`).expect(200);

    const { _id: rowId, ...row } = (await observations().findOne({ flightId: offer.id })) ?? {};
    expect(rowId).toBeDefined();
    await observations().insertOne({
      ...row,
      source: "observed",
      observedOn: addDaysIso(tehranToday(), -2),
      adultBaseFare: 1,
    });
    const after = await request(server).get(`/v1/flights/${offer.id}/price-analysis`).expect(200);
    expect(after.body.data.history).toEqual(before.body.data.history);
  });
});
