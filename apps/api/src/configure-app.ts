import { VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import type { Env } from "./config/env.js";

// Shared by main.ts and e2e tests so tests exercise the real HTTP setup
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.enableCors({ origin: config.get("CORS_ORIGINS", { infer: true }), credentials: true });
  app.enableShutdownHooks();
}
