import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Connection } from "mongoose";
import { Types } from "mongoose";

import { PiiCipher } from "../src/common/crypto/pii-cipher.js";
import { MIGRATIONS } from "../src/migrations/migrations.js";
import { runMigrations } from "../src/migrations/run-migrations.js";
import {
  adultPassenger,
  createTestApp,
  firstOffer,
  foreignPassenger,
  futureDate,
  signedInAgent,
  validNationalId,
} from "./helpers.js";

const quiet = { log: () => undefined };

describe("identity numbers at rest (e2e)", () => {
  let app: NestExpressApplication;
  let connection: Connection;
  let pii: PiiCipher;

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get(getConnectionToken());
    pii = app.get(PiiCipher);
  });
  afterAll(async () => {
    await app.close();
  });

  const rawPassenger = (id: string) =>
    connection.collection("passengers").findOne({ _id: new Types.ObjectId(id) });

  it("stores a saved traveller's national code encrypted and returns it in the clear", async () => {
    const agent = await signedInAgent(app);
    const traveller = adultPassenger();
    const created = await agent.post("/v1/passengers").send(traveller).expect(201);
    expect(created.body.data.nationalId).toBe(traveller.nationalId);

    const raw = await rawPassenger(created.body.data.id);
    expect(raw?.nationalId).toMatch(/^pii1:/);
    expect(JSON.stringify(raw)).not.toContain(String(traveller.nationalId));
    expect(raw?.nationalIdHash).toBe(pii.blindIndex("nationalId", String(traveller.nationalId)));

    const listed = await agent.get("/v1/passengers").expect(200);
    expect(listed.body.data[0].nationalId).toBe(traveller.nationalId);

    // The blind index still enforces one national code per user
    const dup = await agent.post("/v1/passengers").send(traveller).expect(409);
    expect(dup.body.message).toContain("کد ملی");
    // ...but not across users
    await (await signedInAgent(app)).post("/v1/passengers").send(traveller).expect(201);
  });

  it("re-encrypts a patched national code or passport and clears the hash with the value", async () => {
    const agent = await signedInAgent(app);
    const created = await agent.post("/v1/passengers").send(foreignPassenger()).expect(201);
    const id = created.body.data.id as string;

    const before = await rawPassenger(id);
    expect(before?.passportNumber).toMatch(/^pii1:/);
    expect(before?.nationalId).toBeNull();
    expect(before?.nationalIdHash).toBeNull();

    const patched = await agent
      .patch(`/v1/passengers/${id}`)
      .send({ passportNumber: "Z9988776" })
      .expect(200);
    expect(patched.body.data.passportNumber).toBe("Z9988776");
    const after = await rawPassenger(id);
    expect(after?.passportNumber).toMatch(/^pii1:/);
    expect(after?.passportNumberHash).toBe(pii.blindIndex("passportNumber", "Z9988776"));

    const nationalId = validNationalId(Date.now() % 700_000_000);
    const iranian = await agent
      .patch(`/v1/passengers/${id}`)
      .send({ ...adultPassenger({ nationalId }), nationality: "IR", passportNumber: null })
      .expect(200);
    expect(iranian.body.data.nationalId).toBe(nationalId);
    expect(iranian.body.data.passportNumber).toBeNull();
    const iranianRaw = await rawPassenger(id);
    expect(iranianRaw?.nationalId).toMatch(/^pii1:/);
    expect(iranianRaw?.passportNumber).toBeNull();
    expect(iranianRaw?.passportNumberHash).toBeNull();
  });

  it("stores booking passengers encrypted and still shows the masked numbers", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, {
      origin: "THR",
      destination: "MHD",
      date: futureDate(23),
      adults: 2,
    });
    const iranian = adultPassenger();
    const foreigner = foreignPassenger();
    const created = await agent
      .post("/v1/bookings")
      .send({
        outboundFlightId: offer.id,
        passengers: [iranian, foreigner],
        contact: { mobile: "09121234567" },
        quotedTotal: offer.fare.total,
      })
      .expect(201);
    const [first, second] = created.body.data.passengers;
    expect(first.nationalIdMasked).toBe(`******${String(iranian.nationalId).slice(-4)}`);
    expect(second.passportNumberMasked).toMatch(
      new RegExp(`${String(foreigner.passportNumber).slice(-3)}$`),
    );

    const raw = await connection
      .collection("bookings")
      .findOne({ _id: new Types.ObjectId(created.body.data.id as string) });
    const stored = JSON.stringify(raw);
    expect(stored).not.toContain(String(iranian.nationalId));
    expect(stored).not.toContain(String(foreigner.passportNumber));
    expect(raw?.passengers[0].nationalIdHash).toBe(
      pii.blindIndex("nationalId", String(iranian.nationalId)),
    );
    expect(raw?.passengers[1].passportNumberHash).toBe(
      pii.blindIndex("passportNumber", String(foreigner.passportNumber)),
    );

    const read = await agent.get(`/v1/bookings/${created.body.data.id}`).expect(200);
    expect(read.body.data.passengers[0].nationalIdMasked).toBe(first.nationalIdMasked);
  });

  it("migration 0002 encrypts plaintext rows once and drops the plaintext indexes", async () => {
    const passengers = connection.collection("passengers");
    const bookings = connection.collection("bookings");
    // The plaintext-era indexes, as an existing deployment has them
    await passengers.createIndex(
      { nationalId: 1, userId: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null, nationalId: { $type: "string" } },
      },
    );
    await passengers.createIndex(
      { userId: 1, nationality: 1, passportNumber: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null, passportNumber: { $type: "string" } },
      },
    );

    const userId = new Types.ObjectId();
    const nationalId = validNationalId(424_242);
    const legacyPassenger = await passengers.insertOne({
      userId,
      firstNameEn: "Legacy",
      lastNameEn: "Traveller",
      nationality: "IR",
      nationalId,
      passportNumber: "K1234567",
      birthDate: "1980-01-01",
      gender: "FEMALE",
      deletedAt: new Date(),
    });
    const legacyBooking = await bookings.insertOne({
      userId,
      pnr: "LEGACY",
      passengers: [
        { index: 0, nationalId, passportNumber: null, seats: { OUTBOUND: "3A" } },
        { index: 1, nationalId: null, passportNumber: "P7654321", seats: { OUTBOUND: "3B" } },
      ],
    });

    const ran = await runMigrations(connection, MIGRATIONS, quiet);
    expect(ran).toContain("0002-encrypt-passenger-identity-numbers");

    const passenger = await passengers.findOne({ _id: legacyPassenger.insertedId });
    expect(passenger?.nationalId).toMatch(/^pii1:/);
    expect(pii.decrypt("nationalId", passenger?.nationalId as string)).toBe(nationalId);
    expect(passenger?.nationalIdHash).toBe(pii.blindIndex("nationalId", nationalId));
    expect(pii.decrypt("passportNumber", passenger?.passportNumber as string)).toBe("K1234567");

    const booking = await bookings.findOne({ _id: legacyBooking.insertedId });
    expect(pii.decrypt("nationalId", booking?.passengers[0].nationalId as string)).toBe(nationalId);
    expect(booking?.passengers[0].passportNumber).toBeNull();
    expect(booking?.passengers[0].seats).toEqual({ OUTBOUND: "3A" });
    expect(booking?.passengers[1].nationalId).toBeNull();
    expect(pii.decrypt("passportNumber", booking?.passengers[1].passportNumber as string)).toBe(
      "P7654321",
    );
    expect(booking?.passengers[1].passportNumberHash).toBe(
      pii.blindIndex("passportNumber", "P7654321"),
    );

    const names = (await passengers.indexes()).map((index) => index.name);
    expect(names).not.toContain("nationalId_1_userId_1");
    expect(names).not.toContain("userId_1_nationality_1_passportNumber_1");
    expect(names).toContain("nationalIdHash_1_userId_1");

    // Applied once; a manual rerun of the step leaves ciphertexts untouched
    expect(await runMigrations(connection, MIGRATIONS, quiet)).toEqual([]);
    const step = MIGRATIONS.find((m) => m.id === "0002-encrypt-passenger-identity-numbers");
    await step?.up(connection);
    expect((await passengers.findOne({ _id: legacyPassenger.insertedId }))?.nationalId).toBe(
      passenger?.nationalId,
    );
  });
});
