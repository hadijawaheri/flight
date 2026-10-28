import type { ExecutionContext } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { CronSecretGuard } from "./cron-secret.guard.js";

const SECRET = "cron-secret-cron-secret";

function check(secret: string | undefined, authorization?: string) {
  const config = { get: () => secret } as unknown as ConfigService<Env, true>;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
  return () => new CronSecretGuard(config).canActivate(ctx);
}

function statusOf(run: () => boolean): number | undefined {
  try {
    run();
    return undefined;
  } catch (error: unknown) {
    return error instanceof HttpException ? error.getStatus() : -1;
  }
}

describe("CronSecretGuard", () => {
  it("hides the routes when no secret is configured", () => {
    expect(statusOf(check(undefined, `Bearer ${SECRET}`))).toBe(404);
  });
  it("rejects a missing, wrong or differently sized header", () => {
    for (const header of [undefined, "Bearer nope", `Bearer ${SECRET}x`, SECRET]) {
      expect(statusOf(check(SECRET, header))).toBe(401);
    }
  });
  it("accepts the exact bearer secret", () => {
    expect(check(SECRET, `Bearer ${SECRET}`)()).toBe(true);
  });
});
