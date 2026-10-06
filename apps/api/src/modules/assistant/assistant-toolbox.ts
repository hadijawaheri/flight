import type { AssistantCardDto, AssistantTool } from "@flysmart/contracts";
import {
  CABINS,
  FARE_FAMILIES,
  FLIGHT_TYPES,
  flightIdSchema,
  isKnownLocationCode,
  isoDateSchema,
  locationLabel,
  RELIABILITY_LABELS,
  searchFlightsQuerySchema,
  tomanToRial,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { AppException } from "../../common/app-exception.js";
import type { LlmTool } from "../../infra/ai/llm.provider.js";
import { BookingsService } from "../bookings/bookings.service.js";
import { FlightsService } from "../flights/flights.service.js";
import { KnowledgeService } from "../knowledge/knowledge.service.js";
import {
  batteryCard,
  bookingRefundCard,
  cheapestFlightsCard,
  excessBaggageCard,
  genericRefundCard,
  priceAdviceCard,
} from "./cards.js";

export interface ToolContext {
  /** Present only when the visitor has a valid session. */
  userId?: string;
  flightId?: string;
  bookingId?: string;
}

export interface ToolOutcome {
  /** What the model (or the offline answer) reads back. */
  content: string;
  isError: boolean;
  card?: AssistantCardDto;
  /** Knowledge-base entries the outcome is based on. */
  citationIds: string[];
}

export type ToolName = "search_rules" | AssistantTool;

const positive = z.coerce.number().positive().finite();

export const toolSchemas = {
  search_rules: z.object({ query: z.string().trim().min(2).max(200) }),
  evaluate_battery: z
    .object({
      watt_hours: positive.max(2000).optional(),
      milliamp_hours: positive.max(1_000_000).optional(),
      volts: positive.max(60).optional(),
      spare: z.boolean().default(true),
    })
    .refine((value) => value.watt_hours !== undefined || value.milliamp_hours !== undefined, {
      message: "ظرفیت باتری (وات‌ساعت یا میلی‌آمپرساعت) لازم است",
    }),
  excess_baggage: z.object({
    baggage_kg: positive.max(500),
    allowance_kg: positive.max(100).optional(),
    full_economy_fare_toman: positive.optional(),
    rate_percent_per_kg: positive.max(10).optional(),
  }),
  refund_estimate: z.object({
    booking_id: z.string().trim().max(40).optional(),
    base_fare_toman: positive.optional(),
    hours_before_departure: z.coerce.number().finite().optional(),
    fare_family: z.enum(FARE_FAMILIES).default("STANDARD"),
    flight_type: z.enum(FLIGHT_TYPES).default("SYSTEMIC"),
    reason: z.enum(["VOLUNTARY", "AIRLINE_CANCELLED", "DELAY_OVER_2H"]).default("VOLUNTARY"),
  }),
  price_advice: z.object({ flight_id: flightIdSchema.optional() }),
  cheapest_flights: z.object({
    origin: z.string().trim().toUpperCase().refine(isKnownLocationCode, "مبدأ ناشناخته است"),
    destination: z.string().trim().toUpperCase().refine(isKnownLocationCode, "مقصد ناشناخته است"),
    date: isoDateSchema,
    cabin: z.enum(CABINS).default("ECONOMY"),
  }),
} as const;

/** Tool declarations sent to the model. Names are the contract; descriptions steer when to call. */
export const LLM_TOOLS: LlmTool[] = [
  {
    name: "search_rules",
    description:
      "Search the verified knowledge base of flight and airport rules (baggage, dangerous goods, documents, refunds, delays, check-in, children, health, seats, pets, how this platform works). Call this before answering any rules question.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Persian or English search phrase" } },
      required: ["query"],
    },
  },
  {
    name: "evaluate_battery",
    description:
      "Decide whether a power bank or lithium battery may be carried. Give watt_hours, or milliamp_hours (and volts if not 3.7).",
    input_schema: {
      type: "object",
      properties: {
        watt_hours: { type: "number" },
        milliamp_hours: { type: "number" },
        volts: { type: "number" },
        spare: {
          type: "boolean",
          description: "true for a loose battery or power bank; false when installed in a device",
        },
      },
    },
  },
  {
    name: "excess_baggage",
    description:
      "Estimate the excess-baggage fee. If the user is viewing a flight the allowance and fare are filled in automatically; otherwise pass allowance_kg and full_economy_fare_toman.",
    input_schema: {
      type: "object",
      properties: {
        baggage_kg: { type: "number", description: "Total weight of checked bags" },
        allowance_kg: { type: "number" },
        full_economy_fare_toman: { type: "number" },
        rate_percent_per_kg: {
          type: "number",
          description: "Airline rate, percent of the full fare per kg; default 1",
        },
      },
      required: ["baggage_kg"],
    },
  },
  {
    name: "refund_estimate",
    description:
      "Estimate the refund for cancelling. For the user's own booking pass booking_id (or rely on the open booking). For a hypothetical ticket pass base_fare_toman and hours_before_departure.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string" },
        base_fare_toman: { type: "number" },
        hours_before_departure: { type: "number" },
        fare_family: { type: "string", enum: [...FARE_FAMILIES] },
        flight_type: { type: "string", enum: [...FLIGHT_TYPES] },
        reason: { type: "string", enum: ["VOLUNTARY", "AIRLINE_CANCELLED", "DELAY_OVER_2H"] },
      },
    },
  },
  {
    name: "price_advice",
    description:
      "Buy-now-or-wait advice with a 7-day forecast for a flight. Uses the open flight when flight_id is omitted.",
    input_schema: { type: "object", properties: { flight_id: { type: "string" } } },
  },
  {
    name: "cheapest_flights",
    description:
      "Cheapest bookable flights on a route and date. origin/destination are IATA codes (THR, MHD, IKA...), date is YYYY-MM-DD.",
    input_schema: {
      type: "object",
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        date: { type: "string" },
        cabin: { type: "string", enum: [...CABINS] },
      },
      required: ["origin", "destination", "date"],
    },
  },
];

const fail = (content: string): ToolOutcome => ({ content, isError: true, citationIds: [] });

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("؛ ");
}

@Injectable()
export class AssistantToolbox {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly flights: FlightsService,
    private readonly bookings: BookingsService,
  ) {}

  isTool(name: string): name is ToolName {
    return name in toolSchemas;
  }

  async run(name: ToolName, input: unknown, context: ToolContext): Promise<ToolOutcome> {
    try {
      switch (name) {
        case "search_rules":
          return this.searchRules(input);
        case "evaluate_battery":
          return this.battery(input);
        case "excess_baggage":
          return await this.excessBaggage(input, context);
        case "refund_estimate":
          return await this.refund(input, context);
        case "price_advice":
          return await this.priceAdvice(input, context);
        case "cheapest_flights":
          return await this.cheapest(input);
      }
    } catch (error: unknown) {
      if (error instanceof AppException) return fail(error.message);
      throw error;
    }
  }

  private searchRules(input: unknown): ToolOutcome {
    const parsed = toolSchemas.search_rules.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));

    const hits = this.knowledge.search(parsed.data.query, 3);
    if (hits.length === 0) {
      return {
        content:
          "هیچ قانون تأییدشده‌ای برای این پرسش در پایگاه دانش نیست. به کاربر بگو مطمئن نیستی و او را به ایرلاین ارجاع بده.",
        isError: false,
        citationIds: [],
      };
    }
    const content = hits
      .map(({ entry }) =>
        [
          `[${entry.id}] ${entry.title} — اعتبار: ${RELIABILITY_LABELS[entry.reliability]}${entry.verifyWith ? ` (تأیید با: ${entry.verifyWith})` : ""}`,
          entry.summary,
          ...entry.details.map((detail) => `- ${detail}`),
        ].join("\n"),
      )
      .join("\n\n");
    return { content, isError: false, citationIds: hits.map((hit) => hit.entry.id) };
  }

  private battery(input: unknown): ToolOutcome {
    const parsed = toolSchemas.evaluate_battery.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));
    const { watt_hours, milliamp_hours, volts, spare } = parsed.data;
    const card = batteryCard({
      wattHours: watt_hours,
      milliampHours: milliamp_hours,
      volts,
      spare,
    });
    if (!card) return fail("ظرفیت باتری قابل محاسبه نیست");
    return {
      content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
      isError: false,
      card,
      citationIds: ["dg-lithium-batteries"],
    };
  }

  private async excessBaggage(input: unknown, context: ToolContext): Promise<ToolOutcome> {
    const parsed = toolSchemas.excess_baggage.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));
    const args = parsed.data;

    let allowanceKg = args.allowance_kg;
    let fareRial =
      args.full_economy_fare_toman === undefined
        ? undefined
        : tomanToRial(args.full_economy_fare_toman);
    if ((allowanceKg === undefined || fareRial === undefined) && context.flightId) {
      const offer = await this.flights.getOffer(context.flightId, {
        adults: 1,
        children: 0,
        infants: 0,
      });
      allowanceKg ??= offer.baggageKg;
      fareRial ??= offer.adultBaseFare;
    }
    if (allowanceKg === undefined)
      return fail("سهمیه‌ی بار مشخص نیست؛ از کاربر بپرس بلیتش چند کیلو بار مجاز دارد.");
    if (fareRial === undefined)
      return fail(
        "کرایه‌ی کامل اکونومی مسیر مشخص نیست؛ از کاربر بخواه پروازش را باز کند یا کرایه را بگوید.",
      );

    const card = excessBaggageCard({
      baggageKg: args.baggage_kg,
      allowanceKg,
      fullEconomyFare: fareRial,
      ratePercentPerKg: args.rate_percent_per_kg,
    });
    return {
      content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
      isError: false,
      card,
      citationIds: ["baggage-excess"],
    };
  }

  private async refund(input: unknown, context: ToolContext): Promise<ToolOutcome> {
    const parsed = toolSchemas.refund_estimate.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));
    const args = parsed.data;

    const bookingId = args.booking_id ?? context.bookingId;
    if (bookingId) {
      if (!context.userId)
        return fail(
          "برای محاسبه روی رزرو واقعی باید وارد حساب شوید. کاربر را به ورود راهنمایی کن.",
        );
      const quote = await this.bookings.refundQuote(context.userId, bookingId);
      const card = bookingRefundCard(quote);
      return {
        content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
        isError: false,
        card,
        citationIds: ["refund-voluntary", "platform-refund"],
      };
    }

    if (args.base_fare_toman === undefined || args.hours_before_departure === undefined) {
      return fail(
        "برای برآورد، کرایه‌ی پایه (تومان) و ساعت مانده تا پرواز لازم است؛ یا رزرو را مشخص کنید.",
      );
    }
    const card = genericRefundCard({
      baseFareToman: args.base_fare_toman,
      hoursBeforeDeparture: args.hours_before_departure,
      family: args.fare_family,
      flightType: args.flight_type,
      reason: args.reason,
    });
    const citation = args.reason === "VOLUNTARY" ? "refund-voluntary" : "refund-involuntary";
    return {
      content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
      isError: false,
      card,
      citationIds: [citation],
    };
  }

  private async priceAdvice(input: unknown, context: ToolContext): Promise<ToolOutcome> {
    const parsed = toolSchemas.price_advice.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));

    const flightId = parsed.data.flight_id ?? context.flightId;
    if (!flightId)
      return fail("پرواز مشخص نیست؛ از کاربر بخواه پروازی را باز کند یا مسیر و تاریخ را بگوید.");

    const record = await this.flights.resolve(flightId);
    const seats = (await this.flights.seatsOf([record])).get(record.id);
    const insight = await this.flights.insightFor(record, seats?.seatsLeft ?? 0);
    const label = `${record.airline.nameFa} ${record.flightNumber}، ${record.origin.cityFa} به ${record.destination.cityFa}`;
    const card = priceAdviceCard(insight, label, `/flights/${record.id}`);
    return {
      content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
      isError: false,
      card,
      citationIds: ["platform-price-analysis"],
    };
  }

  private async cheapest(input: unknown): Promise<ToolOutcome> {
    const parsed = toolSchemas.cheapest_flights.safeParse(input);
    if (!parsed.success) return fail(describeIssues(parsed.error));
    const { origin, destination, date, cabin } = parsed.data;
    if (origin === destination) return fail("مبدأ و مقصد نباید یکسان باشند");

    // Parsing fills the schema's defaults so this stays in step with what HTTP callers get
    const result = await this.flights.search(
      searchFlightsQuerySchema.parse({ origin, destination, date, cabin, sort: "price" }),
    );
    const rows = result.offers.slice(0, 3).map((offer) => ({
      label: `${offer.airline.nameFa} ${offer.flightNumber} — ${offer.origin.localTime.slice(11, 16)}`,
      pricePerAdult: offer.pricePerAdult,
      href: `/flights/${offer.id}`,
    }));
    const card = cheapestFlightsCard(
      `${locationLabel(origin)} به ${locationLabel(destination)}`,
      date,
      rows,
    );
    return {
      content: JSON.stringify({ title: card.title, rows: card.rows, note: card.note }),
      isError: false,
      card,
      citationIds: [],
    };
  }
}
