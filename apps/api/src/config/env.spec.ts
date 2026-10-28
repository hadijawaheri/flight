import { describe, expect, it } from "vitest";

import { validateEnv } from "./env.js";

const base = {
  DATABASE_URL: "mongodb://127.0.0.1:27017/flysmart",
  JWT_ACCESS_SECRET: "a".repeat(32),
  OTP_HMAC_SECRET: "b".repeat(32),
};
const piiKey = Buffer.alloc(32, 7).toString("base64");

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

  it("still rejects short secrets", () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: "short" })).toThrow();
  });

  it("forbids the mock payment provider in production", () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: "production", PII_ENCRYPTION_KEY: piiKey }),
    ).toThrow(/mock payment/);
  });

  it("lets a demo keep simulated payments while sign-in uses real SMS", () => {
    const prod = {
      ...base,
      NODE_ENV: "production",
      PII_ENCRYPTION_KEY: piiKey,
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

  it("requires a well-formed PII encryption key in production only", () => {
    const prod = {
      ...base,
      NODE_ENV: "production",
      SMS_PROVIDER: "melipayamak",
      MELIPAYAMAK_API_KEY: "key",
      MELIPAYAMAK_OTP_BODY_ID: "12345",
      ALLOW_SIMULATED_PAYMENTS: "true",
    };
    expect(() => validateEnv(prod)).toThrow(/PII_ENCRYPTION_KEY is required/);
    expect(() => validateEnv({ ...prod, PII_ENCRYPTION_KEY: "" })).toThrow(/required/);
    expect(validateEnv({ ...prod, PII_ENCRYPTION_KEY: piiKey }).PII_ENCRYPTION_KEY).toBe(piiKey);

    expect(validateEnv(base).PII_ENCRYPTION_KEY).toBeUndefined();
    expect(() => validateEnv({ ...base, PII_ENCRYPTION_KEY: "too-short" })).toThrow(
      /32 random bytes/,
    );
    expect(() =>
      validateEnv({ ...base, PII_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64") }),
    ).toThrow(/32 random bytes/);
  });
});
