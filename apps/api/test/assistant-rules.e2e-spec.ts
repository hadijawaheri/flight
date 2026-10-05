import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { createTestApp, firstOffer, futureDate } from "./helpers.js";

describe("rules and assistant (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it("lists, filters and reads rules without a session", async () => {
    const all = await request(server()).get("/v1/rules").expect(200);
    expect(all.body.data.entries.length).toBeGreaterThan(20);

    const filtered = await request(server())
      .get("/v1/rules")
      .query({ category: "BAGGAGE" })
      .expect(200);
    expect(
      filtered.body.data.entries.every(
        (entry: { category: string }) => entry.category === "BAGGAGE",
      ),
    ).toBe(true);

    const one = await request(server()).get("/v1/rules/dg-lithium-batteries").expect(200);
    expect(one.body.data.reliability).toBe("STANDARD");
    await request(server()).get("/v1/rules/unknown").expect(404);
  });

  it("serves an airport guide", async () => {
    const res = await request(server()).get("/v1/airports/IKA/guide").expect(200);
    expect(res.body.data.international).toBe(true);
    await request(server()).get("/v1/airports/ZZZ/guide").expect(404);
  });

  it("reports offline mode without an API key and answers from the knowledge base", async () => {
    const status = await request(server()).get("/v1/assistant/status").expect(200);
    expect(status.body.data.mode).toBe("offline");

    const res = await request(server())
      .post("/v1/assistant/ask")
      .send({ message: "پاوربانک ۲۰۰۰۰ میلی‌آمپر در پرواز مجاز است؟" })
      .expect(200);
    expect(res.body.data.cards[0]).toMatchObject({ tool: "evaluate_battery", tone: "ok" });
    expect(res.body.data.citations.length).toBeGreaterThan(0);
  });

  it("gives price advice for the open flight", async () => {
    const offer = await firstOffer(app, {
      origin: "THR",
      destination: "MHD",
      date: futureDate(21),
    });
    const res = await request(server())
      .post("/v1/assistant/ask")
      .send({ message: "الان بخرم یا صبر کنم؟", context: { flightId: offer.id } })
      .expect(200);
    expect(res.body.data.cards[0].tool).toBe("price_advice");
  });

  it("validates the message", async () => {
    await request(server()).post("/v1/assistant/ask").send({ message: "" }).expect(400);
    await request(server())
      .post("/v1/assistant/ask")
      .send({ message: "x".repeat(1001) })
      .expect(400);
  });

  it("exposes the payment mode to the checkout", async () => {
    const res = await request(server()).get("/v1/payments/config").expect(200);
    expect(res.body.data).toEqual({ provider: "mock", simulated: true });
  });
});
