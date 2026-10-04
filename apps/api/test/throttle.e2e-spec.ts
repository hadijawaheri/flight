import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { createTestApp, uniqueMobile } from "./helpers.js";

describe("rate limiting (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = "true";
    app = await createTestApp();
  });
  afterAll(async () => {
    process.env.THROTTLE_ENABLED = "false";
    await app.close();
  });

  it("limits OTP requests per IP to 3 per minute", async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post("/v1/auth/otp/request")
        .send({ mobile: uniqueMobile() })
        .expect(204);
    }
    const res = await request(app.getHttpServer())
      .post("/v1/auth/otp/request")
      .send({ mobile: uniqueMobile() })
      .expect(429);
    expect(res.body.code).toBe("RATE_LIMITED");
  });
});
