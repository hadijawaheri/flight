import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  INTERNAL_API_URL: z.url().default("http://localhost:7781"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:7782"),
});

export const env = serverEnvSchema.parse(process.env);
