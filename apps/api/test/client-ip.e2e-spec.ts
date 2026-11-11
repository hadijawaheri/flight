import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER } from "../src/common/http/client-ip.js";
import { createTestApp, uniqueMobile } from "./helpers.js";

const SECRET = "e2e-proxy-secret-that-is-long-enough-12345";

describe("rate limiting behind the web app's proxy (e2e)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = "true";
    process.env.API_PROXY_SECRET = SECRET;
    app = await createTestApp();
  });
  afterAll(async () => {
    process.env.THROTTLE_ENABLED = "false";
    delete process.env.API_PROXY_SECRET;
    await app.close();
  });

  function otp(headers: Record<string, string>) {
    return request(app.getHttpServer())
      .post("/v1/auth/otp/request")
      .set(headers)
      .send({ mobile: uniqueMobile() });
  }

  it("counts each visitor the web app vouches for separately", async () => {
    const first = { [CLIENT_IP_HEADER]: "5.160.0.1", [PROXY_SECRET_HEADER]: SECRET };
    const second = { [CLIENT_IP_HEADER]: "5.160.0.2", [PROXY_SECRET_HEADER]: SECRET };
    for (let i = 0; i < 3; i += 1) await otp(first).expect(204);
    await otp(first).expect(429);
    await otp(second).expect(204);
  });

  it("does not let a caller without the secret pick its own address", async () => {
    for (let i = 0; i < 3; i += 1) await otp({ [CLIENT_IP_HEADER]: `9.9.9.${i}` }).expect(204);
    await otp({ [CLIENT_IP_HEADER]: "9.9.9.9" }).expect(429);
  });
});
