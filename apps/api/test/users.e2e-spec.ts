import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { createTestApp, uniqueMobile } from "./helpers.js";

describe("users (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  async function signIn(mobile = uniqueMobile()) {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/v1/auth/otp/request").send({ mobile }).expect(204);
    const res = await agent
      .post("/v1/auth/otp/verify")
      .send({ mobile, code: "123456" })
      .expect(200);
    return { agent, mobile, userId: res.body.data.user.id as string };
  }

  it("updates the profile and strips unknown fields", async () => {
    const { agent } = await signIn();
    const res = await agent
      .patch("/v1/users/me")
      .send({ firstName: " علی ", lastName: "رضایی", role: "admin" })
      .expect(200);
    expect(res.body.data).toMatchObject({ firstName: "علی", lastName: "رضایی", role: "user" });
  });

  it("validates profile input with Persian messages", async () => {
    const { agent } = await signIn();
    const res = await agent
      .patch("/v1/users/me")
      .send({ firstName: "ع", lastName: "x" })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual([
      "firstName",
      "lastName",
    ]);
  });

  it("soft-deletes the user and allows the same mobile to register again", async () => {
    const first = await signIn();
    await first.agent.delete("/v1/users/me").expect(204);
    await first.agent.get("/v1/auth/me").expect(404);

    const second = await signIn(first.mobile);
    expect(second.userId).not.toBe(first.userId);
    await second.agent.get("/v1/auth/me").expect(200);
  });
});
