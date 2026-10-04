import { randomUUID } from "node:crypto";

import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";

// AppModule is imported lazily: ConfigModule.forRoot validates env at import time,
// so DATABASE_URL must exist before the module graph is evaluated.
export async function createTestApp(): Promise<NestExpressApplication> {
  const url = new URL(process.env.MONGO_BASE_URI ?? "");
  url.pathname = `/test_${randomUUID().replaceAll("-", "")}`;
  process.env.DATABASE_URL = url.toString();

  const { AppModule } = await import("../src/app.module.js");
  const { configureApp } = await import("../src/configure-app.js");

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

let counter = 0;
export function uniqueMobile(): string {
  counter += 1;
  return `0912${String(Date.now()).slice(-4)}${String(counter).padStart(3, "0")}`;
}
