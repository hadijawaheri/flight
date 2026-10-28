import { getModelToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Model } from "mongoose";
import request from "supertest";

import { PriceAlert } from "../src/modules/price-alerts/schemas/price-alert.schema.js";
import { createTestApp, firstOffer, futureDate, signedInAgent } from "./helpers.js";

const AUTH = { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` };

describe("scheduled jobs (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("rejects calls without the scheduler secret", async () => {
    const server = app.getHttpServer();
    await request(server).get("/v1/jobs/price-alerts").expect(401);
    await request(server)
      .get("/v1/jobs/expire-bookings")
      .set("Authorization", "Bearer wrong")
      .expect(401);
  });

  it("fires an alert whose target the fare has reached", async () => {
    const route = { origin: "THR", destination: "MHD", date: futureDate(32) };
    const agent = await signedInAgent(app);
    const cheapest = await firstOffer(app, route);
    const created = await agent
      .post("/v1/price-alerts")
      .send({ ...route, targetPrice: 10_000 })
      .expect(201);
    expect(created.body.data.status).toBe("ACTIVE");

    // Stands in for the fare dropping: raise the target past today's price behind the API's back
    const alerts = app.get<Model<PriceAlert>>(getModelToken(PriceAlert.name));
    await alerts.updateOne(
      { _id: created.body.data.id },
      { $set: { targetPrice: cheapest.pricePerAdult + 1_000_000 } },
    );

    const run = await request(app.getHttpServer())
      .get("/v1/jobs/price-alerts")
      .set(AUTH)
      .expect(200);
    expect(run.body.data.triggered).toBeGreaterThanOrEqual(1);

    const list = await agent.get("/v1/price-alerts").expect(200);
    expect(list.body.data[0].status).toBe("TRIGGERED");

    // A second run finds nothing left to fire
    const again = await request(app.getHttpServer())
      .get("/v1/jobs/price-alerts")
      .set(AUTH)
      .expect(200);
    expect(again.body.data.triggered).toBe(0);
  });

  it("runs the booking expiry sweep", async () => {
    const run = await request(app.getHttpServer())
      .get("/v1/jobs/expire-bookings")
      .set(AUTH)
      .expect(200);
    expect(run.body.data).toEqual({ expired: expect.any(Number) });
  });
});
