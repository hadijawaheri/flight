import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Connection } from "mongoose";
import { Types } from "mongoose";
import type { MockInstance } from "vitest";

import { SmsProvider } from "../src/infra/sms/sms.provider.js";
import { PriceAlertsService } from "../src/modules/price-alerts/price-alerts.service.js";
import type { Agent } from "./helpers.js";
import { createTestApp, firstOffer, futureDate, signedInAgent, uniqueMobile } from "./helpers.js";

describe("price alert SMS (e2e)", () => {
  let app: NestExpressApplication;
  let alerts: PriceAlertsService;
  let connection: Connection;
  let send: MockInstance<SmsProvider["sendPriceAlert"]>;
  const route = { origin: "THR", destination: "MHD", date: futureDate(30) };

  beforeAll(async () => {
    app = await createTestApp();
    alerts = app.get(PriceAlertsService);
    connection = app.get(getConnectionToken());
    send = vi.spyOn(app.get(SmsProvider), "sendPriceAlert");
  });
  afterEach(() => {
    send.mockReset();
  });
  afterAll(async () => {
    send.mockRestore();
    await app.close();
  });

  // A target above today's fare fires as soon as the alert is created
  async function fire(agent: Agent): Promise<{ id: string; sms: unknown; triggeredPrice: number }> {
    const cheapest = await firstOffer(app, route);
    const res = await agent
      .post("/v1/price-alerts")
      .send({ ...route, targetPrice: cheapest.pricePerAdult + 1_000_000 })
      .expect(201);
    expect(res.body.data.status).toBe("TRIGGERED");
    return res.body.data;
  }

  const raw = (id: string) =>
    connection.collection("pricealerts").findOne({ _id: new Types.ObjectId(id) });

  it("texts the traveller's mobile when the alert fires and shows it as sent", async () => {
    send.mockResolvedValue("SENT");
    const mobile = uniqueMobile();
    const agent = await signedInAgent(app, mobile);

    const fired = await fire(agent);
    expect(send).toHaveBeenCalledTimes(1);
    const [to, text] = send.mock.calls[0] ?? [];
    expect(to).toBe(mobile);
    expect(text?.route).toBe("تهران به مشهد");
    expect(text?.price).toMatch(/تومان$/);
    expect(text?.date).toMatch(/^[۰-۹]+ \S+$/);
    expect(fired.sms).toEqual({ status: "SENT", sentAt: expect.any(String) });

    const listed = await agent.get("/v1/price-alerts").expect(200);
    expect(listed.body.data[0].sms.status).toBe("SENT");
  });

  it("retries a failed text on the next sweep and gives up after three attempts", async () => {
    send.mockRejectedValueOnce(new Error("SMS was not sent (500)"));
    const agent = await signedInAgent(app);
    const fired = await fire(agent);
    expect(fired.sms).toEqual({ status: "FAILED", sentAt: null });
    expect((await raw(fired.id))?.smsLastError).toContain("500");

    send.mockResolvedValueOnce("SENT");
    expect(await alerts.retrySms()).toBeGreaterThanOrEqual(1);
    const retried = await raw(fired.id);
    expect(retried?.smsStatus).toBe("SENT");
    expect(retried?.smsAttempts).toBe(2);
    expect(retried?.smsLastError).toBeNull();

    // Already sent: another sweep must not text again
    send.mockClear();
    await alerts.retrySms();
    expect(send).not.toHaveBeenCalled();

    send.mockRejectedValue(new Error("down"));
    const other = await fire(await signedInAgent(app));
    await alerts.retrySms();
    await alerts.retrySms();
    await alerts.retrySms();
    const exhausted = await raw(other.id);
    expect(exhausted?.smsStatus).toBe("FAILED");
    expect(exhausted?.smsAttempts).toBe(3);
  });

  it("records SKIPPED when the deployment has no alert channel and does not retry it", async () => {
    send.mockResolvedValue("SKIPPED");
    const fired = await fire(await signedInAgent(app));
    expect(fired.sms).toEqual({ status: "SKIPPED", sentAt: null });
    send.mockClear();
    await alerts.retrySms();
    expect((await raw(fired.id))?.smsAttempts).toBe(1);
  });

  it("takes over an attempt whose process died, but not a fresh one", async () => {
    send.mockResolvedValue("SENT");
    const fired = await fire(await signedInAgent(app));
    const collection = connection.collection("pricealerts");
    const id = new Types.ObjectId(fired.id);

    await collection.updateOne(
      { _id: id },
      { $set: { smsStatus: "PENDING", smsClaimedAt: new Date(), smsSentAt: null } },
    );
    send.mockClear();
    await alerts.retrySms();
    expect((await raw(fired.id))?.smsStatus).toBe("PENDING");

    await collection.updateOne(
      { _id: id },
      { $set: { smsClaimedAt: new Date(Date.now() - 11 * 60_000) } },
    );
    await alerts.retrySms();
    const taken = await raw(fired.id);
    expect(taken?.smsStatus).toBe("SENT");
    expect(taken?.smsAttempts).toBe(2);
  });

  it("starts the SMS over when a fired alert is re-armed", async () => {
    send.mockResolvedValue("SENT");
    const agent = await signedInAgent(app);
    const fired = await fire(agent);
    const rearmed = await agent
      .patch(`/v1/price-alerts/${fired.id}`)
      .send({ targetPrice: 10_000 })
      .expect(200);
    expect(rearmed.body.data.status).toBe("ACTIVE");
    expect(rearmed.body.data.sms).toBeNull();
    expect((await raw(fired.id))?.smsAttempts).toBe(0);
  });

  it("never lets an SMS outage break creating an alert", async () => {
    send.mockRejectedValue(new Error("timeout"));
    const fired = await fire(await signedInAgent(app));
    expect(fired.triggeredPrice).toBeGreaterThan(0);
  });
});
