import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { adultPassenger, createTestApp, firstOffer, futureDate, signedInAgent } from "./helpers.js";

describe("price alerts (e2e)", () => {
  let app: NestExpressApplication;
  const route = { origin: "THR", destination: "MHD", date: futureDate(30) };

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("requires a session", async () => {
    await request(app.getHttpServer()).get("/v1/price-alerts").expect(401);
  });

  it("creates, re-arms and deletes an alert", async () => {
    const agent = await signedInAgent(app);
    const cheapest = await firstOffer(app, route);

    const created = await agent
      .post("/v1/price-alerts")
      .send({ ...route, targetPrice: cheapest.pricePerAdult + 1_000_000 })
      .expect(201);
    // The target is above today's fare, so the alert fires immediately
    expect(created.body.data.status).toBe("TRIGGERED");
    expect(created.body.data.triggeredFlightId).toBeTruthy();

    const rearmed = await agent
      .patch(`/v1/price-alerts/${created.body.data.id}`)
      .send({ targetPrice: Math.max(10_000, cheapest.pricePerAdult - 5_000_000) })
      .expect(200);
    expect(rearmed.body.data.status).toBe("ACTIVE");

    await agent.delete(`/v1/price-alerts/${created.body.data.id}`).expect(204);
    const list = await agent.get("/v1/price-alerts").expect(200);
    expect(list.body.data).toEqual([]);
  });

  it("rejects an alert whose origin equals its destination and keeps alerts private", async () => {
    const owner = await signedInAgent(app);
    const stranger = await signedInAgent(app);
    await owner
      .post("/v1/price-alerts")
      .send({ ...route, destination: "THR", targetPrice: 1_000_000 })
      .expect(400);

    const created = await owner
      .post("/v1/price-alerts")
      .send({ ...route, targetPrice: 10_000 })
      .expect(201);
    await stranger
      .patch(`/v1/price-alerts/${created.body.data.id}`)
      .send({ targetPrice: 20_000 })
      .expect(404);
    await stranger.delete(`/v1/price-alerts/${created.body.data.id}`).expect(404);
  });
});

describe("passenger vault (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("saves travellers per user and keeps the default flag on partial updates", async () => {
    const agent = await signedInAgent(app);
    const created = await agent
      .post("/v1/passengers")
      .send({ ...adultPassenger(), isDefault: true })
      .expect(201);
    expect(created.body.data.isDefault).toBe(true);

    const patched = await agent
      .patch(`/v1/passengers/${created.body.data.id}`)
      .send({ firstNameFa: "حسین" })
      .expect(200);
    expect(patched.body.data.firstNameFa).toBe("حسین");
    expect(patched.body.data.isDefault).toBe(true);

    const other = await signedInAgent(app);
    expect((await other.get("/v1/passengers").expect(200)).body.data).toEqual([]);
    await other.delete(`/v1/passengers/${created.body.data.id}`).expect(404);
    await agent.delete(`/v1/passengers/${created.body.data.id}`).expect(204);
  });

  it("rejects an invalid national code and non-latin English names", async () => {
    const agent = await signedInAgent(app);
    const bad = await agent
      .post("/v1/passengers")
      .send(adultPassenger({ nationalId: "1234567890" }))
      .expect(400);
    expect(bad.body.code).toBe("VALIDATION_FAILED");
    await agent
      .post("/v1/passengers")
      .send(adultPassenger({ firstNameEn: "علی" }))
      .expect(400);
  });
});
