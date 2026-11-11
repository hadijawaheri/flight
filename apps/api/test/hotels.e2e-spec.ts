import { stayDatesForTrip } from "@flysmart/contracts";
import { getConnectionToken } from "@nestjs/mongoose";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Connection } from "mongoose";
import { Types } from "mongoose";
import request from "supertest";

import { createTestApp, firstOffer, futureDate, signedInAgent } from "./helpers.js";

interface RoomBody {
  id: string;
  total: number;
  roomsLeft: number;
  nightlyRates: Array<{ date: string; amount: number }>;
}

describe("hotels (e2e)", () => {
  let app: NestExpressApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get(getConnectionToken());
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it("finds hotels at a booked flight's destination for its dates", async () => {
    const outbound = await firstOffer(app, {
      origin: "THR",
      destination: "MHD",
      date: futureDate(21),
    });
    const stay = stayDatesForTrip(
      {
        arrivalUtc: outbound.arrivalUtc,
        destinationUtcOffsetMinutes: outbound.destination.utcOffsetMinutes,
      },
      null,
      3,
    );
    expect(stay).not.toBeNull();

    const res = await http()
      .get("/v1/hotels/search")
      .query({
        city: outbound.destination.airportCode,
        checkIn: stay?.checkIn,
        checkOut: stay?.checkOut,
        adults: 2,
      })
      .expect(200);
    expect(res.body.data.nights).toBe(3);
    expect(res.body.data.hotels.length).toBeGreaterThan(0);
    const [hotel] = res.body.data.hotels;
    expect(hotel).toMatchObject({ cityFa: "مشهد", checkIn: stay?.checkIn, nights: 3 });
    expect(hotel.fromTotal).toBeGreaterThan(0);
    // Mapped DTO only, never the raw supplier record
    expect(hotel).not.toHaveProperty("utcOffsetMinutes");
  });

  it("filters and sorts", async () => {
    const base = { city: "SYZ", checkIn: futureDate(30), checkOut: futureDate(32) };
    const all = await http()
      .get("/v1/hotels/search")
      .query({ ...base, sort: "price" })
      .expect(200);
    const totals = (all.body.data.hotels as Array<{ fromTotal: number }>).map((h) => h.fromTotal);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));

    const fourStar = await http()
      .get("/v1/hotels/search")
      .query({ ...base, minStars: 4 })
      .expect(200);
    for (const hotel of fourStar.body.data.hotels as Array<{ stars: number }>) {
      expect(hotel.stars).toBeGreaterThanOrEqual(4);
    }
  });

  it("charges more for a peak night (Nowruz) than a quiet one", async () => {
    const quiet = await http()
      .get("/v1/hotels/HMHD01")
      .query({ checkIn: "2027-01-20", checkOut: "2027-01-21" })
      .expect(200);
    const peak = await http()
      .get("/v1/hotels/HMHD01")
      .query({ checkIn: "2027-03-21", checkOut: "2027-03-22" })
      .expect(200);
    const quietRoom = (quiet.body.data.rooms as RoomBody[])[0];
    const peakRoom = (peak.body.data.rooms as RoomBody[]).find((room) => room.id === quietRoom?.id);
    expect(peakRoom?.total).toBeGreaterThan((quietRoom?.total ?? 0) * 1.2);
  });

  it("answers 404 for an unknown hotel and 400 for reversed dates", async () => {
    await http()
      .get("/v1/hotels/HXXX01")
      .query({ checkIn: futureDate(10), checkOut: futureDate(11) })
      .expect(404);
    await http()
      .get("/v1/hotels/search")
      .query({ city: "MHD", checkIn: futureDate(12), checkOut: futureDate(10) })
      .expect(400);
  });

  it("holds a room for 15 minutes, re-checks the price and frees the room when the hold lapses", async () => {
    const agent = await signedInAgent(app);
    const stay = { checkIn: futureDate(40), checkOut: futureDate(42), adults: 2 };
    const detail = await http().get("/v1/hotels/HIFN01").query(stay).expect(200);
    const room = (detail.body.data.rooms as RoomBody[]).find((item) => item.roomsLeft > 0);
    if (!room) throw new Error("no free room in the seeded hotel");

    const stale = await agent
      .post("/v1/hotels/holds")
      .send({ hotelId: "HIFN01", roomId: room.id, ...stay, quotedTotal: room.total - 10_000 })
      .expect(409);
    expect(stale.body.code).toBe("FARE_CHANGED");

    const held = await agent
      .post("/v1/hotels/holds")
      .send({ hotelId: "HIFN01", roomId: room.id, ...stay, quotedTotal: room.total })
      .expect(201);
    const minutes = (Date.parse(held.body.data.expiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);

    const roomsLeft = async () =>
      (
        (await http().get("/v1/hotels/HIFN01").query(stay).expect(200)).body.data
          .rooms as RoomBody[]
      ).find((item) => item.id === room.id)?.roomsLeft;
    expect(await roomsLeft()).toBe(room.roomsLeft - 1);

    // Fifteen minutes later: the hold has lapsed, the room is for sale again before the TTL sweep
    await connection
      .collection("roomholds")
      .updateOne(
        { _id: new Types.ObjectId(held.body.data.id as string) },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
    expect(await roomsLeft()).toBe(room.roomsLeft);
  });

  /** Fills a room type for a stay as if other travellers held every room but `leave`. */
  async function fillRoom(
    hotelId: string,
    room: RoomBody,
    stay: { checkIn: string; checkOut: string },
    leave: number,
  ) {
    const nights = room.nightlyRates.map((night) => night.date);
    await connection.collection("roomholds").insertOne({
      userId: new Types.ObjectId(),
      hotelId,
      roomId: room.id,
      ...stay,
      nights,
      rooms: room.roomsLeft - leave,
      total: room.total,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });
  }

  it("refuses a hold when the hotel is full and lets the traveller release their own", async () => {
    const agent = await signedInAgent(app);
    const stay = { checkIn: futureDate(50), checkOut: futureDate(51), adults: 1 };
    const detail = await http().get("/v1/hotels/HTBZ01").query(stay).expect(200);
    const room = (detail.body.data.rooms as RoomBody[])[0];
    if (!room) throw new Error("no room in the seeded hotel");
    await fillRoom("HTBZ01", room, stay, 1);

    const body = { hotelId: "HTBZ01", roomId: room.id, ...stay, quotedTotal: room.total };
    const last = await agent.post("/v1/hotels/holds").send(body).expect(201);
    const full = await agent.post("/v1/hotels/holds").send(body).expect(409);
    expect(full.body.code).toBe("ROOM_UNAVAILABLE");

    await (await signedInAgent(app)).delete(`/v1/hotels/holds/${last.body.data.id}`).expect(404);
    await agent.delete(`/v1/hotels/holds/${last.body.data.id}`).expect(204);
    await agent.post("/v1/hotels/holds").send(body).expect(201);
  });

  it("sells the last room once when two travellers hold it at the same moment", async () => {
    const stay = { checkIn: futureDate(55), checkOut: futureDate(57), adults: 1 };
    const detail = await http().get("/v1/hotels/HSYZ01").query(stay).expect(200);
    const room = (detail.body.data.rooms as RoomBody[])[0];
    if (!room) throw new Error("no room in the seeded hotel");
    await fillRoom("HSYZ01", room, stay, 1);

    const agents = await Promise.all([1, 2, 3, 4].map(() => signedInAgent(app)));
    const body = { hotelId: "HSYZ01", roomId: room.id, ...stay, quotedTotal: room.total };
    const results = await Promise.all(
      agents.map((agent) => agent.post("/v1/hotels/holds").send(body)),
    );
    expect(results.filter((res) => res.status === 201)).toHaveLength(1);
    expect(results.filter((res) => res.status === 409)).toHaveLength(3);

    const after = await http().get("/v1/hotels/HSYZ01").query(stay).expect(200);
    const left = (after.body.data.rooms as RoomBody[]).find((item) => item.id === room.id);
    expect(left?.roomsLeft).toBe(0);
  });

  it("caps live holds per traveller and shows a sold-out hotel without a price", async () => {
    const agent = await signedInAgent(app);
    const stay = { checkIn: futureDate(60), checkOut: futureDate(61), adults: 1 };
    const detail = await http().get("/v1/hotels/HKIH01").query(stay).expect(200);
    const rooms = detail.body.data.rooms as RoomBody[];
    const room = rooms[0];
    if (!room) throw new Error("no room in the seeded hotel");

    const body = { hotelId: "HKIH01", roomId: room.id, ...stay, quotedTotal: room.total };
    const allowed = Math.min(3, room.roomsLeft);
    for (let index = 0; index < allowed; index += 1) {
      await agent.post("/v1/hotels/holds").send(body).expect(201);
    }
    if (allowed === 3) {
      const capped = await agent.post("/v1/hotels/holds").send(body).expect(409);
      expect(capped.body.code).toBe("CONFLICT");
    }

    for (const item of rooms) {
      const current = (
        (await http().get("/v1/hotels/HKIH01").query(stay).expect(200)).body.data
          .rooms as RoomBody[]
      ).find((candidate) => candidate.id === item.id);
      if (current && current.roomsLeft > 0) await fillRoom("HKIH01", current, stay, 0);
    }
    const soldOut = await http().get("/v1/hotels/HKIH01").query(stay).expect(200);
    expect(soldOut.body.data.fromTotal).toBeNull();
  });

  it("needs a signed-in traveller to hold a room", async () => {
    await http().post("/v1/hotels/holds").send({}).expect(401);
  });
});
