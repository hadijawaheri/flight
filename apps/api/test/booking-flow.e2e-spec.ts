import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";

import type { Agent } from "./helpers.js";
import {
  adultPassenger,
  birthDateYearsAgo,
  createTestApp,
  firstOffer,
  foreignPassenger,
  type FoundOffer,
  futureDate,
  signedInAgent,
} from "./helpers.js";

describe("booking flow (e2e)", () => {
  let app: NestExpressApplication;
  const route = { origin: "THR", destination: "MHD", date: futureDate(21) };

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const draft = (offer: FoundOffer, extra: Record<string, unknown> = {}) => ({
    outboundFlightId: offer.id,
    passengers: [adultPassenger()],
    contact: { mobile: "09121234567" },
    quotedTotal: offer.fare.total,
    ...extra,
  });

  // Not async: the supertest request must stay chainable (.expect) until awaited
  const book = (agent: Agent, offer: FoundOffer, extra: Record<string, unknown> = {}) =>
    agent.post("/v1/bookings").send(draft(offer, extra));

  it("requires a session", async () => {
    await request(app.getHttpServer()).get("/v1/bookings").expect(401);
    await request(app.getHttpServer()).post("/v1/bookings").send({}).expect(401);
  });

  it("books, holds seats, pays and lists the trip", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);

    const created = await book(agent, offer).expect(201);
    const booking = created.body.data;
    expect(booking.status).toBe("PENDING_PAYMENT");
    expect(booking.pnr).toHaveLength(6);
    expect(booking.passengers[0].nationalIdMasked).toMatch(/^\*+\d{4}$/);
    expect(booking.passengers[0].seats.OUTBOUND).toMatch(/^\d+[A-Z]$/);
    expect(booking.totals.total).toBe(offer.fare.total + booking.totals.seatFeesTotal);

    const paid = await agent
      .post(`/v1/bookings/${booking.id}/pay`)
      .send({ outcome: "SUCCESS" })
      .expect(200);
    expect(paid.body.data.payment.status).toBe("SUCCEEDED");
    expect(paid.body.data.booking.status).toBe("CONFIRMED");
    expect(paid.body.data.booking.passengers[0].tickets.OUTBOUND).toBeTruthy();

    const list = await agent.get("/v1/bookings").expect(200);
    expect(list.body.data.some((item: { id: string }) => item.id === booking.id)).toBe(true);
  });

  it("charges only once even if pay is called twice", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const booking = (await book(agent, offer).expect(201)).body.data;

    const first = await agent.post(`/v1/bookings/${booking.id}/pay`).send({}).expect(200);
    const again = await agent.post(`/v1/bookings/${booking.id}/pay`).send({}).expect(200);
    expect(again.body.data.payment.id).toBe(first.body.data.payment.id);
  });

  it("refuses to pay a cancelled booking", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const booking = (await book(agent, offer).expect(201)).body.data;
    await agent.post(`/v1/bookings/${booking.id}/cancel`).expect(200);

    const res = await agent.post(`/v1/bookings/${booking.id}/pay`).send({}).expect(409);
    expect(["BOOKING_NOT_PAYABLE", "BOOKING_EXPIRED"]).toContain(res.body.code);
  });

  it("keeps the booking payable after a failed payment", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const booking = (await book(agent, offer).expect(201)).body.data;

    const failed = await agent
      .post(`/v1/bookings/${booking.id}/pay`)
      .send({ outcome: "FAILURE" })
      .expect(200);
    expect(failed.body.data.payment.status).toBe("FAILED");
    const read = await agent.get(`/v1/bookings/${booking.id}`).expect(200);
    expect(read.body.data.status).toBe("PENDING_PAYMENT");

    await agent.post(`/v1/bookings/${booking.id}/pay`).send({ outcome: "SUCCESS" }).expect(200);
  });

  it("answers FARE_CHANGED when the quoted total is stale", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const res = await book(agent, offer, { quotedTotal: offer.fare.total + 1_000_000 }).expect(409);
    expect(res.body.code).toBe("FARE_CHANGED");
  });

  it("never gives the same seat to two travellers", async () => {
    const offer = await firstOffer(app, route);
    const first = await signedInAgent(app);
    const second = await signedInAgent(app);

    const a = (await book(first, offer).expect(201)).body.data;
    const b = (await book(second, offer).expect(201)).body.data;
    expect(a.passengers[0].seats.OUTBOUND).not.toBe(b.passengers[0].seats.OUTBOUND);

    const taken = a.passengers[0].seats.OUTBOUND as string;
    const clash = await second
      .patch(`/v1/bookings/${b.id}/seats`)
      .send({ seats: [{ slice: "OUTBOUND", passengerIndex: 0, seat: taken }] })
      .expect(409);
    expect(clash.body.code).toBe("SEAT_UNAVAILABLE");
  });

  it("refuses a second active booking for the same traveller on the same flight", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const traveller = adultPassenger();
    await agent
      .post("/v1/bookings")
      .send(draft(offer, { passengers: [traveller] }))
      .expect(201);
    const dup = await agent
      .post("/v1/bookings")
      .send(draft(offer, { passengers: [traveller] }))
      .expect(409);
    expect(dup.body.code).toBe("CONFLICT");
  });

  it("quotes and processes a cancellation with the stepped penalty", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const booking = (await book(agent, offer).expect(201)).body.data;
    await agent.post(`/v1/bookings/${booking.id}/pay`).send({}).expect(200);

    const quote = (await agent.get(`/v1/bookings/${booking.id}/refund-quote`).expect(200)).body
      .data;
    expect(quote.cancellable).toBe(true);
    expect(quote.totalRefund).toBeGreaterThan(0);
    expect(quote.totalRefund).toBeLessThan(booking.totals.total);

    const cancelled = (await agent.post(`/v1/bookings/${booking.id}/cancel`).expect(200)).body.data;
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.refund.refundAmount).toBe(quote.totalRefund);

    const second = await agent.post(`/v1/bookings/${booking.id}/cancel`).expect(409);
    expect(second.body.code).toBe("BOOKING_NOT_CANCELLABLE");
  });

  it("frees the seats of an unpaid booking that is cancelled", async () => {
    const agent = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const traveller = adultPassenger();
    const first = (
      await agent
        .post("/v1/bookings")
        .send(draft(offer, { passengers: [traveller] }))
        .expect(201)
    ).body.data;
    await agent.post(`/v1/bookings/${first.id}/cancel`).expect(200);
    await agent
      .post("/v1/bookings")
      .send(draft(offer, { passengers: [traveller] }))
      .expect(201);
  });

  it("hides other users' bookings", async () => {
    const owner = await signedInAgent(app);
    const stranger = await signedInAgent(app);
    const offer = await firstOffer(app, route);
    const booking = (await book(owner, offer).expect(201)).body.data;

    await stranger.get(`/v1/bookings/${booking.id}`).expect(404);
    await stranger.post(`/v1/bookings/${booking.id}/pay`).send({}).expect(404);
    await stranger.post(`/v1/bookings/${booking.id}/cancel`).expect(404);
  });

  it("books a round trip and holds seats on both legs", async () => {
    const agent = await signedInAgent(app);
    const out = await firstOffer(app, route);
    const back = await firstOffer(app, { origin: "MHD", destination: "THR", date: futureDate(25) });

    const res = await agent
      .post("/v1/bookings")
      .send(draft(out, { returnFlightId: back.id, quotedTotal: out.fare.total + back.fare.total }))
      .expect(201);
    expect(res.body.data.slices).toHaveLength(2);
    expect(res.body.data.passengers[0].seats.RETURN).toBeTruthy();
  });

  describe("escort rules", () => {
    it("refuses a 12-17 year old as the only companion of a child or infant", async () => {
      const agent = await signedInAgent(app);
      const offer = await firstOffer(app, { ...route, adults: 1, children: 1 });
      const teen = adultPassenger({ birthDate: birthDateYearsAgo(16) });
      const child = adultPassenger({ birthDate: birthDateYearsAgo(6) });

      const res = await book(agent, offer, { passengers: [teen, child] }).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.message).toContain("۱۸");
    });

    it("books an adult travelling with an infant", async () => {
      const agent = await signedInAgent(app);
      const offer = await firstOffer(app, { ...route, adults: 1, infants: 1 });
      const infant = adultPassenger({ birthDate: birthDateYearsAgo(1) });

      const res = await book(agent, offer, { passengers: [adultPassenger(), infant] }).expect(201);
      expect(res.body.data.passengers.map((p: { type: string }) => p.type)).toEqual([
        "ADULT",
        "INFANT",
      ]);
    });
  });

  describe("foreign passengers", () => {
    it("books a non-Iranian with only a passport and shows no national code", async () => {
      const agent = await signedInAgent(app);
      const offer = await firstOffer(app, route);

      const res = await book(agent, offer, { passengers: [foreignPassenger()] }).expect(201);
      const [saved] = res.body.data.passengers;
      expect(saved.nationality).toBe("DE");
      expect(saved.nationalIdMasked).toBeNull();
      expect(saved.passportNumberMasked).toMatch(/^\*+\w{3}$/);
    });

    it("needs the passport of a foreigner even on a domestic flight", async () => {
      const agent = await signedInAgent(app);
      const offer = await firstOffer(app, route);

      const res = await book(agent, offer, {
        passengers: [foreignPassenger({ passportNumber: undefined, passportExpiry: undefined })],
      }).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it("refuses the same foreigner twice on one flight by passport number", async () => {
      const agent = await signedInAgent(app);
      const offer = await firstOffer(app, route);
      const traveller = foreignPassenger();

      await book(agent, offer, { passengers: [traveller] }).expect(201);
      const dup = await book(agent, offer, { passengers: [traveller] }).expect(409);
      expect(dup.body.code).toBe("CONFLICT");
    });
  });

  describe("passport validity on international flights", () => {
    const abroad = { origin: "IKA", destination: "IST" };

    async function internationalOffer(): Promise<{ offer: FoundOffer; date: string }> {
      for (let ahead = 21; ahead < 35; ahead += 1) {
        const date = futureDate(ahead);
        try {
          return { offer: await firstOffer(app, { ...abroad, date }), date };
        } catch {
          // No flight that day in the simulated schedule: try the next one
        }
      }
      throw new Error("No international flight found in the next two weeks");
    }

    const expiringIn = (date: string, days: number) =>
      adultPassenger({
        passportNumber: "A1234567",
        passportExpiry: new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
          .toISOString()
          .slice(0, 10),
      });

    it("blocks a passport that is expired on the travel date, even when acknowledged", async () => {
      const agent = await signedInAgent(app);
      const { offer, date } = await internationalOffer();

      const res = await book(agent, offer, {
        passengers: [expiringIn(date, -1)],
        passportValidityAcknowledged: true,
      }).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it("asks for an acknowledgement when under six months remain, then accepts it", async () => {
      const agent = await signedInAgent(app);
      const { offer, date } = await internationalOffer();
      const passengers = [expiringIn(date, 60)];

      const refused = await book(agent, offer, { passengers }).expect(400);
      expect(refused.body.message).toContain("۶ ماه");
      expect(refused.body.details).toEqual([
        expect.objectContaining({ path: "passportValidityAcknowledged" }),
      ]);

      await book(agent, offer, { passengers, passportValidityAcknowledged: true }).expect(201);
    });

    it("books without any acknowledgement when the passport is valid for six months", async () => {
      const agent = await signedInAgent(app);
      const { offer, date } = await internationalOffer();

      await book(agent, offer, { passengers: [expiringIn(date, 400)] }).expect(201);
    });
  });
});
