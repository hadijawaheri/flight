import { VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import { createOriginMatcher } from "./common/cors.js";
import type { Env } from "./config/env.js";

// Shared by main.ts and e2e tests so tests exercise the real HTTP setup
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  const isAllowedOrigin = createOriginMatcher(config.get("CORS_ORIGINS", { infer: true }));
  app.enableCors({
    // No Origin header means a server-to-server call (Next on Vercel, curl); CORS does not apply
    origin: (origin, callback) => callback(null, origin === undefined || isAllowedOrigin(origin)),
    credentials: true,
  });
  app.enableShutdownHooks();
}
