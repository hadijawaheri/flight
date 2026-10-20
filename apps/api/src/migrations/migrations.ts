import type { Connection } from "mongoose";

export interface Migration {
  /** Never rename: the id is what marks a migration as applied. */
  id: string;
  up(connection: Connection): Promise<void>;
}

const INDEX_NOT_FOUND = 27;

// Append only. Each migration runs once, in order, and must be safe to rerun after a crash.
export const MIGRATIONS: Migration[] = [
  {
    // ADR 0008: the old unique index on userId + nationalId made every foreigner collide.
    // The runner creates the replacement indexes before any migration runs.
    id: "0001-drop-legacy-passenger-national-id-index",
    async up(connection) {
      try {
        await connection.collection("passengers").dropIndex("userId_1_nationalId_1");
      } catch (error: unknown) {
        if ((error as { code?: number }).code !== INDEX_NOT_FOUND) throw error;
      }
    },
  },
];
