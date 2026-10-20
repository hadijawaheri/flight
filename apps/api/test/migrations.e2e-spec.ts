import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Connection } from "mongoose";

import type { Migration } from "../src/migrations/migrations.js";
import { MIGRATIONS } from "../src/migrations/migrations.js";
import { runMigrations } from "../src/migrations/run-migrations.js";
import { createTestApp } from "./helpers.js";

const quiet = { log: () => undefined };

describe("migrations (e2e)", () => {
  let app: NestExpressApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get(getConnectionToken());
  });
  afterAll(async () => {
    await app.close();
  });

  it("drops the legacy passenger index and applies each migration only once", async () => {
    const passengers = connection.collection("passengers");
    await passengers.createIndex({ userId: 1, nationalId: 1 }, { unique: true });

    expect(await runMigrations(connection, MIGRATIONS, quiet)).toEqual([
      "0001-drop-legacy-passenger-national-id-index",
    ]);
    const names = (await passengers.indexes()).map((index) => index.name);
    expect(names).not.toContain("userId_1_nationalId_1");

    expect(await runMigrations(connection, MIGRATIONS, quiet)).toEqual([]);
  });

  it("runs new migrations after the applied ones", async () => {
    let calls = 0;
    const extra: Migration = {
      id: "9999-test",
      up: () => {
        calls += 1;
        return Promise.resolve();
      },
    };
    expect(await runMigrations(connection, [...MIGRATIONS, extra], quiet)).toEqual(["9999-test"]);
    await runMigrations(connection, [...MIGRATIONS, extra], quiet);
    expect(calls).toBe(1);
  });
});
