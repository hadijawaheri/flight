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

  it("refuses a hold when the hotel is full and lets the traveller release their own", async () => {
    const agent = await signedInAgent(app);
    const stay = { checkIn: futureDate(50), checkOut: futureDate(51), adults: 1 };
    const detail = await http().get("/v1/hotels/HTBZ01").query(stay).expect(200);
    const room = (detail.body.data.rooms as RoomBody[])[0];
    if (!room) throw new Error("no room in the seeded hotel");

    const holds: string[] = [];
    for (let index = 0; index < room.roomsLeft; index += 1) {
      const res = await agent
        .post("/v1/hotels/holds")
        .send({ hotelId: "HTBZ01", roomId: room.id, ...stay, quotedTotal: room.total })
        .expect(201);
      holds.push(res.body.data.id as string);
    }
    const full = await agent
      .post("/v1/hotels/holds")
      .send({ hotelId: "HTBZ01", roomId: room.id, ...stay, quotedTotal: room.total })
      .expect(409);
    expect(full.body.code).toBe("ROOM_UNAVAILABLE");

    await agent.delete(`/v1/hotels/holds/${holds[0]}`).expect(204);
    await (await signedInAgent(app)).delete(`/v1/hotels/holds/${holds[1] ?? holds[0]}`).expect(404);
    await agent
      .post("/v1/hotels/holds")
      .send({ hotelId: "HTBZ01", roomId: room.id, ...stay, quotedTotal: room.total })
      .expect(201);
  });

  it("needs a signed-in traveller to hold a room", async () => {
    await http().post("/v1/hotels/holds").send({}).expect(401);
  });
});
