import { z } from "zod";

import { decodeMasterKey } from "../common/crypto/pii-cipher.js";

const flag = (fallback: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

// `KEY=` in a .env file arrives as "", which must mean "unset"
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(7781),
    // Behind Caddy the API must not be reachable from outside the machine
    HOST: z.string().default("127.0.0.1"),
    DATABASE_URL: z.string().startsWith("mongodb"),
    JWT_ACCESS_SECRET: z.string().min(32),
    OTP_HMAC_SECRET: z.string().min(32),
    // Encrypts national codes and passport numbers at rest (ADR 0012). Changing it makes stored
    // identities unreadable, so it is backed up with the database credentials, never rotated casually.
    PII_ENCRYPTION_KEY: optionalString.refine(
      (value) => value === undefined || decodeMasterKey(value) !== null,
      "PII_ENCRYPTION_KEY must be base64 of 32 random bytes (openssl rand -base64 32)",
    ),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:7782")
      .transform((value) => value.split(",").map((origin) => origin.trim())),
    SMS_PROVIDER: z.enum(["console", "melipayamak"]).default("console"),
    MELIPAYAMAK_API_KEY: optionalString,
    MELIPAYAMAK_OTP_BODY_ID: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().positive().optional(),
    ),
    MELIPAYAMAK_FROM: optionalString,
    OTP_FIXED_CODE: z.string().length(6).optional(),
    ALLOW_DEV_AUTH: flag("false"),
    // A public demo can keep the simulated gateway while sign-in uses real SMS codes
    ALLOW_SIMULATED_PAYMENTS: flag("false"),
    THROTTLE_ENABLED: flag("true"),

    // Flights and payments run on simulated providers until real ones are connected
    FLIGHT_PROVIDER: z.enum(["simulation"]).default("simulation"),
    PAYMENT_PROVIDER: z.enum(["mock"]).default("mock"),

    // Without a key the assistant answers from the knowledge base only (offline mode).
    // `ANTHROPIC_API_KEY=` in .env.example arrives as "", so empty must mean "unset".
    ANTHROPIC_API_KEY: z
      .string()
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
    ANTHROPIC_BASE_URL: z.string().url().default("https://api.anthropic.com"),
    ASSISTANT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),

    // Background jobs; switched off in tests that need a quiet process
    ALERTS_WATCHER_ENABLED: flag("true"),
    BOOKING_EXPIRER_ENABLED: flag("true"),
  })
  .refine(
    (env) =>
      env.ALLOW_DEV_AUTH ||
      env.NODE_ENV !== "production" ||
      (!env.OTP_FIXED_CODE && env.SMS_PROVIDER !== "console"),
    {
      message:
        "OTP_FIXED_CODE and the console SMS provider are forbidden in production unless ALLOW_DEV_AUTH=true",
    },
  )
  .refine((env) => env.NODE_ENV !== "production" || env.PII_ENCRYPTION_KEY !== undefined, {
    message: "PII_ENCRYPTION_KEY is required in production",
  })
  .refine(
    (env) =>
      env.ALLOW_DEV_AUTH ||
      env.ALLOW_SIMULATED_PAYMENTS ||
      env.NODE_ENV !== "production" ||
      env.PAYMENT_PROVIDER !== "mock",
    {
      message:
        "The mock payment provider is forbidden in production unless ALLOW_SIMULATED_PAYMENTS=true",
    },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
