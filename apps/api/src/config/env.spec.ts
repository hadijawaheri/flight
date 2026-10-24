import { describe, expect, it } from "vitest";

import { validateEnv } from "./env.js";

const base = {
  DATABASE_URL: "mongodb://127.0.0.1:27017/flysmart",
  JWT_ACCESS_SECRET: "a".repeat(32),
  OTP_HMAC_SECRET: "b".repeat(32),
};

describe("validateEnv", () => {
  it("treats an empty ANTHROPIC_API_KEY as unset (offline assistant)", () => {
    expect(validateEnv({ ...base, ANTHROPIC_API_KEY: "" }).ANTHROPIC_API_KEY).toBeUndefined();
    expect(validateEnv({ ...base, ANTHROPIC_API_KEY: "   " }).ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("keeps a real key, trimmed", () => {
    expect(validateEnv({ ...base, ANTHROPIC_API_KEY: " sk-test " }).ANTHROPIC_API_KEY).toBe(
      "sk-test",
    );
  });

  it("accepts scoped preview wildcards in CORS_ORIGINS and rejects broad ones", () => {
    const ok = validateEnv({
      ...base,
      CORS_ORIGINS: "https://app.example.com, https://app-*-team.vercel.app",
    });
    expect(ok.CORS_ORIGINS).toEqual(["https://app.example.com", "https://app-*-team.vercel.app"]);
    expect(() => validateEnv({ ...base, CORS_ORIGINS: "https://*.vercel.app" })).toThrow();
    expect(() => validateEnv({ ...base, CORS_ORIGINS: "*" })).toThrow();
  });

  it("still rejects short secrets", () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: "short" })).toThrow();
  });

  it("forbids the mock payment provider in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow();
  });

  it("lets a demo keep simulated payments while sign-in uses real SMS", () => {
    const prod = {
      ...base,
      NODE_ENV: "production",
      SMS_PROVIDER: "melipayamak",
      MELIPAYAMAK_API_KEY: "key",
      MELIPAYAMAK_OTP_BODY_ID: "12345",
      MELIPAYAMAK_FROM: "",
    };
    expect(() => validateEnv(prod)).toThrow(/ALLOW_SIMULATED_PAYMENTS/);
    const env = validateEnv({ ...prod, ALLOW_SIMULATED_PAYMENTS: "true" });
    expect(env.ALLOW_DEV_AUTH).toBe(false);
    expect(env.MELIPAYAMAK_OTP_BODY_ID).toBe(12345);
    expect(env.MELIPAYAMAK_FROM).toBeUndefined();
  });

  it("still forbids a fixed OTP in production without dev auth", () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        SMS_PROVIDER: "melipayamak",
        OTP_FIXED_CODE: "123456",
        ALLOW_SIMULATED_PAYMENTS: "true",
      }),
    ).toThrow();
  });
});
