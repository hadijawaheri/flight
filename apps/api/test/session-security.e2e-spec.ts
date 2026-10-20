import { getModelToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Model } from "mongoose";
import request from "supertest";

import type { RefreshTokenDocument } from "../src/modules/auth/schemas/refresh-token.schema.js";
import { RefreshToken } from "../src/modules/auth/schemas/refresh-token.schema.js";
import { createTestApp, signedInAgent, uniqueMobile } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("session security (e2e)", () => {
  let app: NestExpressApplication;
  let refreshModel: Model<RefreshTokenDocument>;

  beforeAll(async () => {
    app = await createTestApp();
    refreshModel = app.get(getModelToken(RefreshToken.name));
  });
  afterAll(async () => {
    await app.close();
  });

  async function latestToken(mobile: string) {
    const me = await signedInAgent(app, mobile);
    const user = (await me.get("/v1/auth/me").expect(200)).body.data.user as { id: string };
    const token = await refreshModel.findOne({ userId: user.id }).sort({ _id: -1 }).lean();
    if (!token) throw new Error("no refresh token");
    return { agent: me, userId: user.id, token };
  }

  it("rejects cross-site writes but not same-origin ones or reads", async () => {
    const agent = await signedInAgent(app);
    const crossSite = await agent
      .patch("/v1/users/me")
      .set("Sec-Fetch-Site", "cross-site")
      .send({ firstName: "علی", lastName: "رضایی" })
      .expect(403);
    expect(crossSite.body.code).toBe("FORBIDDEN");
    await agent
      .patch("/v1/users/me")
      .set("Sec-Fetch-Site", "same-site")
      .send({ firstName: "علی", lastName: "رضایی" })
      .expect(403);

    await agent
      .patch("/v1/users/me")
      .set("Sec-Fetch-Site", "same-origin")
      .send({ firstName: "علی", lastName: "رضایی" })
      .expect(200);
    await agent.get("/v1/auth/me").set("Sec-Fetch-Site", "cross-site").expect(200);
  });

  it("caps the refresh token at a week idle and 30 days from sign-in", async () => {
    const { token } = await latestToken(uniqueMobile());
    const idle = token.expiresAt.getTime() - Date.now();
    expect(idle).toBeGreaterThan(6.9 * DAY_MS);
    expect(idle).toBeLessThanOrEqual(7 * DAY_MS);
    const absolute = (token.familyExpiresAt?.getTime() ?? 0) - Date.now();
    expect(absolute).toBeGreaterThan(29.9 * DAY_MS);
  });

  it("never extends a session past its absolute end", async () => {
    const { agent, token } = await latestToken(uniqueMobile());
    const end = new Date(Date.now() + DAY_MS);
    await refreshModel.updateMany({ familyId: token.familyId }, { $set: { familyExpiresAt: end } });

    await agent.post("/v1/auth/refresh").expect(204);
    const rotated = await refreshModel
      .findOne({ familyId: token.familyId, revokedAt: null })
      .lean();
    expect(rotated?.expiresAt.getTime()).toBe(end.getTime());
  });

  it("signs out every device", async () => {
    const mobile = uniqueMobile();
    const laptop = await signedInAgent(app, mobile);
    const phone = await signedInAgent(app, mobile);

    await laptop.post("/v1/auth/logout-all").expect(204);
    await phone.post("/v1/auth/refresh").expect(401);
    await laptop.post("/v1/auth/refresh").expect(401);
  });

  it("asks for a fresh code before deleting the account", async () => {
    const agent = await signedInAgent(app);
    await agent.post("/v1/auth/account/delete").send({}).expect(400);
    await agent.post("/v1/auth/reauth/request").expect(204);
    const wrong = await agent.post("/v1/auth/account/delete").send({ code: "000000" }).expect(400);
    expect(wrong.body.code).toBe("OTP_INVALID");
    await agent.get("/v1/auth/me").expect(200);

    await agent.post("/v1/auth/account/delete").send({ code: "123456" }).expect(204);
    await agent.post("/v1/auth/refresh").expect(401);
  });

  it("no longer deletes the account without a code", async () => {
    const agent = await signedInAgent(app);
    await agent.delete("/v1/users/me").expect(404);
    await request(app.getHttpServer()).post("/v1/auth/reauth/request").expect(401);
  });
});
