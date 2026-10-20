import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { getConnectionToken } from "@nestjs/mongoose";
import type { Connection } from "mongoose";

import { MIGRATIONS } from "./migrations/migrations.js";
import { runMigrations } from "./migrations/run-migrations.js";

// The sweepers must not start inside a one-off deploy step
process.env.ALERTS_WATCHER_ENABLED = "false";
process.env.BOOKING_EXPIRER_ENABLED = "false";

const { AppModule } = await import("./app.module.js");
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ["error", "warn", "log"],
});
const logger = new Logger("Migrate");
try {
  await runMigrations(app.get<Connection>(getConnectionToken()), MIGRATIONS, logger);
} finally {
  await app.close();
}
