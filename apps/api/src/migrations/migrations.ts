import type { Connection, mongo } from "mongoose";

import { PiiCipher } from "../common/crypto/pii-cipher.js";

export interface Migration {
  /** Never rename: the id is what marks a migration as applied. */
  id: string;
  up(connection: Connection): Promise<void>;
}

const INDEX_NOT_FOUND = 27;
const BATCH_SIZE = 500;

async function dropIndexIfPresent(connection: Connection, collection: string, name: string) {
  try {
    await connection.collection(collection).dropIndex(name);
  } catch (error: unknown) {
    if ((error as { code?: number }).code !== INDEX_NOT_FOUND) throw error;
  }
}

interface StoredIdentity {
  nationalId?: string | null;
  nationalIdHash?: string | null;
  passportNumber?: string | null;
  passportNumberHash?: string | null;
}

const needsSealing = (identity: StoredIdentity): boolean =>
  (typeof identity.nationalId === "string" &&
    (!PiiCipher.isEncrypted(identity.nationalId) || !identity.nationalIdHash)) ||
  (typeof identity.passportNumber === "string" &&
    (!PiiCipher.isEncrypted(identity.passportNumber) || !identity.passportNumberHash));

/** The four stored fields for one identity, encrypted and indexed, under a key prefix. */
function sealedFields(pii: PiiCipher, identity: StoredIdentity, prefix = ""): mongo.Document {
  const sealed = pii.seal({
    nationalId: pii.decrypt("nationalId", identity.nationalId),
    passportNumber: pii.decrypt("passportNumber", identity.passportNumber),
  });
  return Object.fromEntries(Object.entries(sealed).map(([key, value]) => [prefix + key, value]));
}

async function flush(
  connection: Connection,
  collection: string,
  batch: mongo.AnyBulkWriteOperation[],
) {
  if (batch.length === 0) return;
  await connection.collection(collection).bulkWrite(batch, { ordered: false });
  batch.length = 0;
}

// Append only. Each migration runs once, in order, and must be safe to rerun after a crash.
export const MIGRATIONS: Migration[] = [
  {
    // ADR 0008: the old unique index on userId + nationalId made every foreigner collide.
    // The runner creates the replacement indexes before any migration runs.
    id: "0001-drop-legacy-passenger-national-id-index",
    async up(connection) {
      await dropIndexIfPresent(connection, "passengers", "userId_1_nationalId_1");
    },
  },
  {
    // ADR 0012: encrypt national codes and passport numbers already stored in the clear, add their
    // blind indexes, then drop the unique indexes on the raw values (the runner has already built the
    // replacements on the hashes). Soft-deleted passengers are included on purpose. Bookings are
    // updated field by field so a seat change made by a running server cannot be overwritten.
    id: "0002-encrypt-passenger-identity-numbers",
    async up(connection) {
      const pii = PiiCipher.fromEnv(process.env);
      const hasNumber: mongo.Filter<StoredIdentity> = {
        $or: [{ nationalId: { $type: "string" } }, { passportNumber: { $type: "string" } }],
      };

      const passengers: mongo.AnyBulkWriteOperation[] = [];
      for await (const passenger of connection
        .collection<StoredIdentity>("passengers")
        .find(hasNumber)) {
        if (!needsSealing(passenger)) continue;
        passengers.push({
          updateOne: {
            filter: { _id: passenger._id },
            update: { $set: sealedFields(pii, passenger) },
          },
        });
        if (passengers.length >= BATCH_SIZE) await flush(connection, "passengers", passengers);
      }
      await flush(connection, "passengers", passengers);

      const bookings: mongo.AnyBulkWriteOperation[] = [];
      const cursor = connection
        .collection("bookings")
        .find({ passengers: { $elemMatch: hasNumber } }, { projection: { passengers: 1 } });
      for await (const booking of cursor) {
        const changes: mongo.Document = {};
        (booking.passengers as StoredIdentity[]).forEach((passenger, index) => {
          if (needsSealing(passenger))
            Object.assign(changes, sealedFields(pii, passenger, `passengers.${index}.`));
        });
        if (Object.keys(changes).length === 0) continue;
        bookings.push({ updateOne: { filter: { _id: booking._id }, update: { $set: changes } } });
        if (bookings.length >= BATCH_SIZE) await flush(connection, "bookings", bookings);
      }
      await flush(connection, "bookings", bookings);

      await dropIndexIfPresent(connection, "passengers", "nationalId_1_userId_1");
      await dropIndexIfPresent(connection, "passengers", "userId_1_nationality_1_passportNumber_1");
    },
  },
];
