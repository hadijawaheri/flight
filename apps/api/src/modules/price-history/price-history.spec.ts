import type { ConfigService } from "@nestjs/config";
import type { Model } from "mongoose";
import type { PinoLogger } from "nestjs-pino";
import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../../common/clock/clock.js";
import type { Env } from "../../config/env.js";
import type { FlightProvider, FlightRecord } from "../../infra/flight/flight.provider.js";
import { mergeHistory, PriceHistoryService } from "./price-history.service.js";
import type { PriceObservationDocument } from "./schemas/price-observation.schema.js";

describe("mergeHistory", () => {
  const modelled = [
    { date: "2026-10-25", price: 100 },
    { date: "2026-10-26", price: 110 },
    { date: "2026-10-27", price: 120 },
    { date: "2026-10-28", price: 130 },
  ];

  it("keeps the model where nothing was observed", () => {
    expect(mergeHistory(modelled, [], "2026-10-28", 10)).toEqual(modelled);
  });

  it("lets an observed day replace the modelled one and adds days only the site saw", () => {
    const merged = mergeHistory(
      modelled.slice(1),
      [
        { date: "2026-10-24", price: 90 },
        { date: "2026-10-26", price: 95 },
      ],
      "2026-10-28",
      10,
    );
    expect(merged).toEqual([
      { date: "2026-10-24", price: 90 },
      { date: "2026-10-26", price: 95 },
      { date: "2026-10-27", price: 120 },
      { date: "2026-10-28", price: 130 },
    ]);
  });

  it("works from observations alone, as with a real provider that has no history", () => {
    const observed = [
      { date: "2026-10-27", price: 120 },
      { date: "2026-10-28", price: 125 },
    ];
    expect(mergeHistory([], observed, "2026-10-28", 45)).toEqual(observed);
  });

  it("keeps the window: today and the pastDays days before, nothing in the future", () => {
    const merged = mergeHistory(
      modelled,
      [
        { date: "2026-10-20", price: 1 },
        { date: "2026-10-29", price: 1 },
      ],
      "2026-10-28",
      3,
    );
    expect(merged.map((point) => point.date)).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
    ]);
  });
});

describe("PriceHistoryService.record", () => {
  const record = {
    id: "THRMHD20261120IR03E",
    origin: { code: "THR", utcOffsetMinutes: 210 },
    destination: { code: "MHD", utcOffsetMinutes: 210 },
    cabin: "ECONOMY",
    departureUtc: new Date("2026-11-20T05:00:00Z"),
    adultBaseFare: 1_500_000,
  } as unknown as FlightRecord;

  function setup(enabled = true) {
    const bulkWrite = vi.fn().mockResolvedValue({});
    const now = new Date("2026-10-28T08:00:00Z");
    const clock = { now: () => now, today: () => "2026-10-28" } as unknown as Clock;
    const service = new PriceHistoryService(
      { bulkWrite } as unknown as Model<PriceObservationDocument>,
      { dataSource: "simulation" } as FlightProvider,
      clock,
      { get: () => enabled } as unknown as ConfigService<Env, true>,
      { warn: vi.fn() } as unknown as PinoLogger,
    );
    return { service, bulkWrite };
  }

  it("upserts one row per flight, source and day with the closing, min and max fare", async () => {
    const { service, bulkWrite } = setup();
    await service.record([{ record, seatsLeft: 12 }]);
    const [operations] = bulkWrite.mock.calls[0] ?? [];
    expect(operations).toHaveLength(1);
    const { filter, update, upsert } = operations[0].updateOne;
    expect(filter).toEqual({ flightId: record.id, source: "simulation", observedOn: "2026-10-28" });
    expect(upsert).toBe(true);
    expect(update.$set).toMatchObject({ adultBaseFare: 1_500_000, seatsLeft: 12 });
    expect(update.$min).toEqual({ minFare: 1_500_000 });
    expect(update.$max).toEqual({ maxFare: 1_500_000 });
    expect(update.$setOnInsert).toMatchObject({ origin: "THR", destination: "MHD" });
  });

  it("skips a fare it just wrote, but writes a changed one", async () => {
    const { service, bulkWrite } = setup();
    await service.record([{ record, seatsLeft: 12 }]);
    await service.record([{ record, seatsLeft: 11 }]);
    expect(bulkWrite).toHaveBeenCalledTimes(1);
    await service.record([{ record: { ...record, adultBaseFare: 1_600_000 }, seatsLeft: 11 }]);
    expect(bulkWrite).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite seats when the caller does not know them", async () => {
    const { service, bulkWrite } = setup();
    await service.record([{ record, seatsLeft: null }]);
    expect(bulkWrite.mock.calls[0]?.[0][0].updateOne.update.$set).not.toHaveProperty("seatsLeft");
  });

  it("never throws, and retries a write that failed", async () => {
    const { service, bulkWrite } = setup();
    bulkWrite.mockRejectedValueOnce(new Error("E11000 duplicate key"));
    await expect(service.record([{ record, seatsLeft: 1 }])).resolves.toBeUndefined();
    await service.record([{ record, seatsLeft: 1 }]);
    expect(bulkWrite).toHaveBeenCalledTimes(2);
  });

  it("does nothing when switched off", async () => {
    const { service, bulkWrite } = setup(false);
    await service.record([{ record, seatsLeft: 1 }]);
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(await service.observedFor([record], 45)).toEqual(new Map());
  });
});
