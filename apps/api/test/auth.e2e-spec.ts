import { getModelToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Model } from "mongoose";
import request from "supertest";

import type { RefreshTokenDocument } from "../src/modules/auth/schemas/refresh-token.schema.js";
import { RefreshToken } from "../src/modules/auth/schemas/refresh-token.schema.js";
import { createTestApp, uniqueMobile } from "./helpers.js";

describe("auth (e2e)", () => {
  let app: NestExpressApplication;
  let refreshModel: Model<RefreshTokenDocument>;

  beforeAll(async () => {
    app = await createTestApp();
    refreshModel = app.get(getModelToken(RefreshToken.name));
  });
  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function signIn(mobile = uniqueMobile()) {
    const agent = request.agent(server());
    await agent.post("/v1/auth/otp/request").send({ mobile }).expect(204);
    const res = await agent
      .post("/v1/auth/otp/verify")
      .send({ mobile, code: "123456" })
      .expect(200);
    return {
      agent,
      mobile,
      user: res.body.data.user,
      cookies: res.headers["set-cookie"] as unknown as string[],
    };
  }

  it("exposes liveness and readiness without auth", async () => {
    await request(server()).get("/health/live").expect(200);
    await request(server()).get("/health/ready").expect(200);
  });

  it("rejects unauthenticated requests with the error envelope", async () => {
    const res = await request(server()).get("/v1/auth/me").expect(401);
    expect(res.body).toMatchObject({ statusCode: 401, code: "UNAUTHENTICATED" });
    expect(typeof res.headers["x-request-id"]).toBe("string");
  });

  it("returns field details for invalid input", async () => {
    const res = await request(server())
      .post("/v1/auth/otp/request")
      .send({ mobile: "123" })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details[0]).toMatchObject({ path: "mobile" });
  });

  it("rejects unknown body shapes instead of crashing", async () => {
    await request(server())
      .post("/v1/auth/otp/request")
      .send("not json")
      .set("Content-Type", "text/plain")
      .expect(400);
  });

  it("signs in with persian digits, sets httpOnly cookies and never leaks the OTP", async () => {
    const mobile = uniqueMobile();
    const persian = mobile.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
    const agent = request.agent(server());

    const requested = await agent
      .post("/v1/auth/otp/request")
      .send({ mobile: persian })
      .expect(204);
    expect(requested.text).toBe("");

    const res = await agent
      .post("/v1/auth/otp/verify")
      .send({ mobile: persian, code: "۱۲۳۴۵۶" })
      .expect(200);
    expect(res.body.data.user).toMatchObject({ mobile, role: "user" });
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
    }

    const me = await agent.get("/v1/auth/me").expect(200);
    expect(me.body.data.user.mobile).toBe(mobile);
  });

  it("enforces the 2 minute resend cooldown", async () => {
    const mobile = uniqueMobile();
    await request(server()).post("/v1/auth/otp/request").send({ mobile }).expect(204);
    const res = await request(server()).post("/v1/auth/otp/request").send({ mobile }).expect(429);
    expect(res.body.code).toBe("RATE_LIMITED");
  });

  it("rejects wrong codes and locks the code after 5 attempts", async () => {
    const mobile = uniqueMobile();
    await request(server()).post("/v1/auth/otp/request").send({ mobile }).expect(204);
    for (let i = 0; i < 5; i += 1) {
      const res = await request(server())
        .post("/v1/auth/otp/verify")
        .send({ mobile, code: "000000" })
        .expect(400);
      expect(res.body.code).toBe("OTP_INVALID");
    }
    const locked = await request(server())
      .post("/v1/auth/otp/verify")
      .send({ mobile, code: "123456" })
      .expect(400);
    expect(locked.body.code).toBe("OTP_EXPIRED");
  });

  it("rejects verify when no code was requested", async () => {
    const res = await request(server())
      .post("/v1/auth/otp/verify")
      .send({ mobile: uniqueMobile(), code: "123456" })
      .expect(400);
    expect(res.body.code).toBe("OTP_EXPIRED");
  });

  it("rotates refresh tokens and tolerates parallel reuse inside the grace window", async () => {
    const { agent, cookies } = await signIn();
    const oldRefresh = cookies.find((c) => c.startsWith("refresh_token="))!.split(";")[0]!;

    await agent.post("/v1/auth/refresh").expect(204);
    await agent.get("/v1/auth/me").expect(200);

    // Same old token again, immediately: allowed (grace), not treated as theft
    await request(server()).post("/v1/auth/refresh").set("Cookie", oldRefresh).expect(204);
    await agent.get("/v1/auth/me").expect(200);
  });

  it("revokes the whole family when a rotated token is reused after the grace window", async () => {
    const { agent, cookies } = await signIn();
    const oldRefresh = cookies.find((c) => c.startsWith("refresh_token="))!.split(";")[0]!;

    await agent.post("/v1/auth/refresh").expect(204); // rotates; old token now revoked
    await refreshModel.updateMany({}, { $set: { revokedAt: new Date(Date.now() - 60_000) } });

    const reuse = await request(server())
      .post("/v1/auth/refresh")
      .set("Cookie", oldRefresh)
      .expect(401);
    expect(reuse.body.code).toBe("UNAUTHENTICATED");

    // The legitimate (newest) token of the same family must be dead too
    await agent.post("/v1/auth/refresh").expect(401);
  });

  it("logout revokes the session and clears cookies", async () => {
    const { agent } = await signIn();
    const res = await agent.post("/v1/auth/logout").expect(204);
    const cleared = res.headers["set-cookie"] as unknown as string[];
    expect(cleared.some((c) => c.startsWith("refresh_token=;"))).toBe(true);

    await request(server()).get("/v1/auth/me").expect(401);
  });

  it("accepts Bearer tokens for non-browser clients", async () => {
    const { cookies } = await signIn();
    const access = cookies
      .find((c) => c.startsWith("access_token="))!
      .split(";")[0]!
      .split("=")[1]!;
    await request(server()).get("/v1/auth/me").set("Authorization", `Bearer ${access}`).expect(200);
  });
});
