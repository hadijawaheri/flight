// Read by the migrate-mongo CLI from apps/api (`pnpm --filter @flysmart/api migrate`).
// Production runs with autoIndex off, so every index lives in a migration (blueprint §13, Data).
import { existsSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

export default {
  mongodb: { url: process.env.DATABASE_URL },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  lockTtl: 300,
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "esm",
};
