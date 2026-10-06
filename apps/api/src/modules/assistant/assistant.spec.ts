import type { RefundQuoteDto } from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import { FixedClock } from "../../common/clock/clock.js";
import type { LlmRequest, LlmResponse } from "../../infra/ai/llm.provider.js";
import { LlmError, LlmProvider } from "../../infra/ai/llm.provider.js";
import { NullLlmProvider } from "../../infra/ai/null-llm.provider.js";
import { BookingsService } from "../bookings/bookings.service.js";
import { FlightsService } from "../flights/flights.service.js";
import { KnowledgeService } from "../knowledge/knowledge.service.js";
import { NOT_FOUND_ANSWER } from "./assistant.prompt.js";
import { AssistantService } from "./assistant.service.js";
import { AssistantToolbox } from "./assistant-toolbox.js";
import { batteryCard, bookingRefundCard, excessBaggageCard, genericRefundCard } from "./cards.js";
import { planOfflineCalls } from "./offline-answerer.js";

const TODAY = "2026-10-05";
const clock = new FixedClock(new Date("2026-10-05T08:00:00Z"));

describe("cards", () => {
  it("classifies batteries by watt-hours", () => {
    expect(batteryCard({ milliampHours: 20_000, spare: true })?.tone).toBe("ok");
    expect(batteryCard({ milliampHours: 30_000, spare: true })?.tone).toBe("warn");
    expect(batteryCard({ milliampHours: 50_000, spare: true })?.tone).toBe("danger");
    expect(batteryCard({ spare: true })).toBeNull();
  });

  it("says spare batteries travel in the cabin only", () => {
    const card = batteryCard({ wattHours: 50, spare: true });
    expect(card?.rows.find((row) => row.label === "محل حمل")?.value).toContain("کابین");
  });

  it("charges 1% of the full fare per excess kilo", () => {
    const card = excessBaggageCard({ baggageKg: 28, allowanceKg: 20, fullEconomyFare: 10_000_000 });
    expect(card.tone).toBe("warn");
    expect(card.rows.find((row) => row.label === "اضافه")?.value).toContain("۸");
    expect(
      excessBaggageCard({ baggageKg: 18, allowanceKg: 20, fullEconomyFare: 10_000_000 }).tone,
    ).toBe("ok");
  });

  it("applies the stepped refund penalty and waives it for airline cancellations", () => {
    const voluntary = genericRefundCard({
      baseFareToman: 1_000_000,
      hoursBeforeDeparture: 50,
      family: "STANDARD",
      flightType: "SYSTEMIC",
      reason: "VOLUNTARY",
    });
    expect(voluntary.title).toContain("۲۵");
    const involuntary = genericRefundCard({
      baseFareToman: 1_000_000,
      hoursBeforeDeparture: 1,
      family: "SAVER",
      flightType: "SYSTEMIC",
      reason: "AIRLINE_CANCELLED",
    });
    expect(involuntary.tone).toBe("ok");
  });

  it("explains why a booking cannot be cancelled", () => {
    const quote: RefundQuoteDto = {
      bookingId: "b1",
      cancellable: false,
      blockedReason: "این رزرو قبلاً لغو شده است",
      slices: [],
      totalRefund: 0,
      totalPenalty: 0,
      totalNonRefundableFees: 0,
    };
    expect(bookingRefundCard(quote).note).toContain("لغو شده");
  });
});

describe("offline planner", () => {
  it("detects a battery question with capacity", () => {
    const [call] = planOfflineCalls("پاوربانک ۲۰۰۰۰ میلی‌آمپر مجازه؟", {}, TODAY);
    expect(call).toEqual({
      name: "evaluate_battery",
      input: { milliamp_hours: 20_000, spare: true },
    });
  });

  it("detects excess baggage with a stated allowance", () => {
    const [call] = planOfflineCalls(
      "اگر ۲۸ کیلو بار داشته باشم اضافه بار چقدر میشه؟ سهمیه ۲۰ کیلو",
      {},
      TODAY,
    );
    expect(call).toEqual({ name: "excess_baggage", input: { baggage_kg: 28, allowance_kg: 20 } });
  });

  it("detects a generic refund question", () => {
    const [call] = planOfflineCalls(
      "بلیت ۳ میلیون تومان ۴۸ ساعت قبل کنسل کنم جریمه چقدره",
      {},
      TODAY,
    );
    expect(call?.name).toBe("refund_estimate");
    expect(call?.input).toMatchObject({ base_fare_toman: 3_000_000, hours_before_departure: 48 });
  });

  it("resolves a cheapest-flight question with a relative date", () => {
    const [call] = planOfflineCalls("ارزان‌ترین پرواز تهران به مشهد فردا", {}, TODAY);
    expect(call).toEqual({
      name: "cheapest_flights",
      input: { origin: "TEH", destination: "MHD", date: "2026-10-06" },
    });
  });

  it("does not turn ordinary words into a route", () => {
    expect(planOfflineCalls("پرواز به سلامت انجام شد از چه ساعتی", {}, TODAY)).toEqual([]);
  });

  it("uses the open booking and flight as context", () => {
    expect(
      planOfflineCalls("این بلیت را کنسل کنم چقدر جریمه می‌شوم", { bookingId: "abc" }, TODAY)[0],
    ).toEqual({
      name: "refund_estimate",
      input: { booking_id: "abc" },
    });
    expect(
      planOfflineCalls("بخرم یا صبر کنم؟", { flightId: "THRMHD20261020IR03E" }, TODAY)[0]?.name,
    ).toBe("price_advice");
    expect(planOfflineCalls("بخرم یا صبر کنم؟", {}, TODAY)).toEqual([]);
  });
});

const knowledge = new KnowledgeService();
const unusedFlights = {} as unknown as FlightsService;
const quote: RefundQuoteDto = {
  bookingId: "b1",
  cancellable: true,
  blockedReason: null,
  slices: [],
  totalRefund: 5_000_000,
  totalPenalty: 1_000_000,
  totalNonRefundableFees: 500_000,
};
const bookingsStub = {
  refundQuote: (userId: string, id: string): Promise<RefundQuoteDto> => {
    if (userId !== "owner") return Promise.reject(new Error("must not be reached for other users"));
    return Promise.resolve({ ...quote, bookingId: id });
  },
} as unknown as BookingsService;
const toolbox = new AssistantToolbox(knowledge, unusedFlights, bookingsStub);

class ScriptedLlm extends LlmProvider {
  readonly available = true;
  readonly requests: LlmRequest[] = [];
  constructor(private readonly script: Array<LlmResponse | LlmError>) {
    super();
  }
  complete(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(structuredClone(request));
    const next = this.script[Math.min(this.requests.length - 1, this.script.length - 1)] as
      LlmResponse | LlmError;
    return next instanceof LlmError ? Promise.reject(next) : Promise.resolve(next);
  }
}

const offline = new AssistantService(new NullLlmProvider(), toolbox, knowledge, clock);
const ask = (
  service: AssistantService,
  message: string,
  context?: { bookingId?: string },
  userId?: string,
) => service.ask({ message, history: [], context }, userId);

describe("assistant (offline mode)", () => {
  it("reports its mode", () => {
    expect(offline.status().mode).toBe("offline");
  });

  it("answers a rules question from the knowledge base with citations and a verify notice", async () => {
    const answer = await ask(offline, "جریمه کنسلی بلیت چقدر است؟");
    expect(answer.mode).toBe("offline");
    expect(answer.citations.map((citation) => citation.id)).toContain("refund-voluntary");
    expect(answer.verifyNotice).not.toBeNull();
  });

  it("computes a battery verdict and attaches the card", async () => {
    const answer = await ask(offline, "پاوربانک ۵۰۰۰۰ میلی‌آمپر می‌توانم ببرم؟");
    expect(answer.cards[0]?.tool).toBe("evaluate_battery");
    expect(answer.cards[0]?.tone).toBe("danger");
    expect(answer.citations.map((citation) => citation.id)).toContain("dg-lithium-batteries");
  });

  it("admits when it does not know instead of guessing", async () => {
    const answer = await ask(offline, "بهترین رستوران شیراز کجاست");
    expect(answer.answer).toBe(NOT_FOUND_ANSWER);
    expect(answer.citations).toEqual([]);
  });

  it("greets and offers starters", async () => {
    const answer = await ask(offline, "سلام");
    expect(answer.suggestions.length).toBeGreaterThan(0);
  });

  it("estimates a refund on the user's own booking only when signed in", async () => {
    const signedOut = await ask(offline, "این بلیت را کنسل کنم جریمه چقدر است", {
      bookingId: "b1",
    });
    expect(signedOut.cards).toEqual([]);
    const signedIn = await ask(
      offline,
      "این بلیت را کنسل کنم جریمه چقدر است",
      { bookingId: "b1" },
      "owner",
    );
    expect(signedIn.cards[0]?.tool).toBe("refund_estimate");
    expect(signedIn.cards[0]?.href).toBe("/dashboard/bookings/b1");
  });
});

describe("assistant (model mode)", () => {
  const toolUse = (input: Record<string, unknown>, name = "search_rules"): LlmResponse => ({
    content: [{ type: "tool_use", id: "t1", name, input }],
    stopReason: "tool_use",
  });
  const text = (value: string): LlmResponse => ({
    content: [{ type: "text", text: value }],
    stopReason: "end_turn",
  });

  it("runs the tool loop and cites only what the tools returned", async () => {
    const llm = new ScriptedLlm([
      toolUse({ query: "بار مجاز" }),
      text("معمولاً ۲۰ کیلوگرم؛ روی بلیت‌تان را ببینید."),
    ]);
    const answer = await ask(
      new AssistantService(llm, toolbox, knowledge, clock),
      "چند کیلو بار مجازم؟",
    );

    expect(answer.mode).toBe("ai");
    expect(answer.answer).toContain("۲۰ کیلوگرم");
    expect(answer.citations.map((citation) => citation.id)).toContain("baggage-checked-allowance");
    expect(answer.verifyNotice).not.toBeNull();

    const second = llm.requests[1] as LlmRequest;
    const last = second.messages[second.messages.length - 1];
    expect(last?.role).toBe("user");
    expect(JSON.stringify(last?.content)).toContain("tool_result");
  });

  it("reports unknown tools back to the model as errors", async () => {
    const llm = new ScriptedLlm([toolUse({}, "delete_everything"), text("متوجه نشدم.")]);
    await ask(new AssistantService(llm, toolbox, knowledge, clock), "سلام دنیا چطوری");
    expect(JSON.stringify(llm.requests[1]?.messages.at(-1)?.content)).toContain("is_error");
  });

  it("rejects invalid tool arguments without throwing", async () => {
    const llm = new ScriptedLlm([
      toolUse({ watt_hours: -5 }, "evaluate_battery"),
      text("لطفاً ظرفیت را بگویید."),
    ]);
    const answer = await ask(new AssistantService(llm, toolbox, knowledge, clock), "باتری");
    expect(answer.mode).toBe("ai");
    expect(answer.cards).toEqual([]);
  });

  it("withdraws the tools on the last round and falls back offline if the model never answers", async () => {
    const llm = new ScriptedLlm([toolUse({ query: "بار" })]);
    const answer = await ask(
      new AssistantService(llm, toolbox, knowledge, clock),
      "چند کیلو بار مجاز دارم",
    );
    expect(llm.requests).toHaveLength(4);
    expect(llm.requests[3]?.tools).toEqual([]);
    expect(answer.mode).toBe("offline");
  });

  it("falls back to the offline answer when the model call fails", async () => {
    const llm = new ScriptedLlm([new LlmError("overloaded", 529)]);
    const answer = await ask(
      new AssistantService(llm, toolbox, knowledge, clock),
      "جریمه کنسلی بلیت",
    );
    expect(answer.mode).toBe("offline");
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it("passes the conversation history and the date to the model", async () => {
    const llm = new ScriptedLlm([text("باشه")]);
    await new AssistantService(llm, toolbox, knowledge, clock).ask(
      {
        message: "و برای کودک؟",
        history: [
          { role: "user", content: "بلیت نوزاد؟" },
          { role: "assistant", content: "ده درصد" },
        ],
      },
      undefined,
    );
    const request = llm.requests[0] as LlmRequest;
    expect(request.messages).toHaveLength(3);
    expect(request.system).toContain("2026-10-05");
  });
});
