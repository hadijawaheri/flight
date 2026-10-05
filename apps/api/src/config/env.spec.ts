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

  it("still rejects short secrets", () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: "short" })).toThrow();
  });

  it("forbids the mock payment provider in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow();
  });
});
