// Every index the Mongoose schemas declared on 2026-10-20. createIndex is a no-op when the same
// index already exists, so this is safe on databases that got them from autoIndex in development.
// New indexes go in new migrations; test/migrations.e2e-spec.ts fails when a schema and the
// migrations disagree.
const INDEXES = {
  users: [
    [{ deletedAt: 1 }, {}],
    [{ mobile: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } }],
  ],
  otps: [
    [{ mobile: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  refreshtokens: [
    [{ tokenHash: 1 }, { unique: true }],
    [{ familyId: 1 }, {}],
    [{ userId: 1 }, {}],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  passengers: [
    [{ deletedAt: 1 }, {}],
    [
      { nationalId: 1, userId: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null, nationalId: { $type: "string" } },
      },
    ],
    [
      { userId: 1, nationality: 1, passportNumber: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null, passportNumber: { $type: "string" } },
      },
    ],
  ],
  seatholds: [
    [{ flightId: 1, seat: 1 }, { unique: true }],
    [{ bookingId: 1 }, {}],
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ],
  pricealerts: [
    [{ deletedAt: 1 }, {}],
    [{ userId: 1, status: 1, date: 1 }, {}],
    [{ status: 1, date: 1 }, {}],
  ],
  bookings: [
    [{ pnr: 1 }, { unique: true }],
    [{ userId: 1, createdAt: -1 }, {}],
    [{ userId: 1, lastDepartureUtc: 1 }, {}],
    [{ status: 1, holdExpiresAt: 1 }, {}],
    [{ "slices.flightId": 1, status: 1 }, {}],
  ],
  payments: [
    [{ bookingId: 1 }, { unique: true, partialFilterExpression: { active: true } }],
    [{ userId: 1, createdAt: -1 }, {}],
  ],
};

export async function up(db) {
  for (const [collection, indexes] of Object.entries(INDEXES)) {
    for (const [keys, options] of indexes) {
      await db.collection(collection).createIndex(keys, options);
    }
  }
}

export async function down() {
  // Dropping indexes would break uniqueness guarantees the app relies on; there is no way back.
}
