import { randomUUID } from "node:crypto";

import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { addDaysIso, tehranToday } from "@flysmart/contracts";
import request from "supertest";

// AppModule is imported lazily: ConfigModule.forRoot validates env at import time,
// so DATABASE_URL must exist before the module graph is evaluated.
export async function createTestApp(): Promise<NestExpressApplication> {
  const url = new URL(process.env.MONGO_BASE_URI ?? "");
  url.pathname = `/test_${randomUUID().replaceAll("-", "")}`;
  process.env.DATABASE_URL = url.toString();

  const { AppModule } = await import("../src/app.module.js");
  const { configureApp } = await import("../src/configure-app.js");

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

let counter = 0;
export function uniqueMobile(): string {
  counter += 1;
  return `0912${String(Date.now()).slice(-4)}${String(counter).padStart(3, "0")}`;
}

/** A day far enough ahead that sales are open and the fare is not in the final-week surge. */
export function futureDate(daysAhead = 21): string {
  return addDaysIso(tehranToday(), daysAhead);
}

/** Builds a checksum-valid Iranian national code from a 9-digit seed. */
export function validNationalId(seed: number): string {
  const body = String(100_000_000 + (seed % 800_000_000)).slice(0, 9);
  const sum = [...body].reduce((acc, digit, index) => acc + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  const check = remainder < 2 ? remainder : 11 - remainder;
  return `${body}${check}`;
}

let passengerCounter = 0;
export function adultPassenger(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  passengerCounter += 1;
  return {
    firstNameFa: "علی",
    lastNameFa: "رضایی",
    firstNameEn: "Ali",
    lastNameEn: "Rezaei",
    nationalId: validNationalId(Date.now() + passengerCounter * 7919),
    birthDate: "1990-04-12",
    gender: "MALE",
    ...overrides,
  };
}

export type Agent = ReturnType<typeof request.agent>;

export async function signedInAgent(
  app: NestExpressApplication,
  mobile = uniqueMobile(),
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer());
  await agent.post("/v1/auth/otp/request").send({ mobile }).expect(204);
  await agent.post("/v1/auth/otp/verify").send({ mobile, code: "123456" }).expect(200);
  return agent;
}

export interface FoundOffer {
  id: string;
  pricePerAdult: number;
  fare: { total: number };
  seatsLeft: number;
}

export async function firstOffer(
  app: NestExpressApplication,
  route: { origin: string; destination: string; date: string },
): Promise<FoundOffer> {
  const res = await request(app.getHttpServer())
    .get("/v1/flights/search")
    .query({ ...route, sort: "price" })
    .expect(200);
  const offer = (res.body.data.offers as FoundOffer[])[0];
  if (!offer)
    throw new Error(`No flights from ${route.origin} to ${route.destination} on ${route.date}`);
  return offer;
}
