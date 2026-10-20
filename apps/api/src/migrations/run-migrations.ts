import type { Connection } from "mongoose";

import type { Migration } from "./migrations.js";

interface Log {
  log(message: string): void;
}

/**
 * Production runs with autoIndex off, so every deploy creates the schemas' indexes here
 * (createIndexes only adds; it never drops) and then applies pending migrations once each.
 */
export async function runMigrations(
  connection: Connection,
  migrations: Migration[],
  log: Log,
): Promise<string[]> {
  for (const model of Object.values(connection.models)) {
    await model.createIndexes();
  }
  log.log(`Indexes ensured for ${Object.keys(connection.models).length} models`);

  const applied = connection.collection<{ _id: string; appliedAt: Date }>("migrations");
  const done = new Set((await applied.find().toArray()).map((row) => row._id));
  const ran: string[] = [];
  for (const migration of migrations) {
    if (done.has(migration.id)) continue;
    log.log(`Applying migration ${migration.id}`);
    await migration.up(connection);
    await applied.insertOne({ _id: migration.id, appliedAt: new Date() });
    ran.push(migration.id);
  }
  log.log(ran.length > 0 ? `Applied ${ran.length} migration(s)` : "No pending migrations");
  return ran;
}
