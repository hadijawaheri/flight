import "server-only";

import { z } from "zod";

import { resolveApiOrigin } from "./api-origin";

const serverEnvSchema = z.object({
  INTERNAL_API_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:7782"),
});

export const env = serverEnvSchema.parse({ ...process.env, INTERNAL_API_URL: resolveApiOrigin() });
