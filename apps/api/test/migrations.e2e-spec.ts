import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { config, database, status, up } from "migrate-mongo";
import type { Connection } from "mongoose";

import { createTestApp } from "./helpers.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

describe("migrations (e2e)", () => {
  let app: NestExpressApplication;
  let connection: Connection;
  const dbName = `migrations_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get(getConnectionToken());
    const url = new URL(process.env.MONGO_BASE_URI ?? "");
    url.pathname = `/${dbName}`;
    config.set({
      mongodb: { url: url.toString() },
      migrationsDir: MIGRATIONS_DIR,
      changelogCollectionName: "changelog",
      lockCollectionName: "changelog_lock",
      lockTtl: 0,
      migrationFileExtension: ".js",
      useFileHash: false,
      moduleSystem: "esm",
    });
  });
  afterAll(async () => {
    await app.close();
  });

  it("creates every index the schemas declare, on an empty database, exactly once", async () => {
    const { db, client } = await database.connect();
    try {
      // The legacy index the second migration removes, as it exists on older databases
      await db.collection("passengers").createIndex({ userId: 1, nationalId: 1 }, { unique: true });

      expect(await up(db, client)).toHaveLength(2);
      expect(await up(db, client)).toEqual([]);
      expect((await status(db)).every((item) => item.appliedAt !== "PENDING")).toBe(true);

      // Production runs with autoIndex off, so a schema index missing here never reaches it
      const fresh = connection.useDb(dbName);
      for (const model of Object.values(connection.models)) {
        const copy = fresh.model(model.modelName, model.schema, model.collection.name);
        const diff = await copy.diffIndexes();
        expect({ collection: model.collection.name, missing: diff.toCreate }).toEqual({
          collection: model.collection.name,
          missing: [],
        });
      }

      const names = (await db.collection("passengers").indexes()).map(
        (index: { name?: string }) => index.name,
      );
      expect(names).not.toContain("userId_1_nationalId_1");
    } finally {
      await client.close();
    }
  });
});
