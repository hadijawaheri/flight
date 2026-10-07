import type { AssistantCardDto, AssistantTool } from "@flysmart/contracts";
import {
  addDaysIso,
  getAirport,
  normalizeDigits,
  normalizeText,
  searchAirports,
} from "@flysmart/contracts";

import type { ToolContext, ToolName } from "./assistant-toolbox.js";

/**
 * Without a language model the assistant still answers: it detects what the user wants with plain
 * patterns, runs the same tools the model would, and quotes the knowledge base. It never guesses —
 * when nothing matches it says so.
 */

export interface PlannedCall {
  name: ToolName;
  input: Record<string, unknown>;
}

const NUMBER = /(\d+(?:[.,]\d+)?)/;

function numberBefore(text: string, units: RegExp): number | null {
  const match = new RegExp(`${NUMBER.source}\\s*(?:${units.source})`).exec(text);
  return match ? Number(match[1]?.replace(",", ".")) : null;
}

function detectBattery(text: string): PlannedCall | null {
  if (!/(پاوربانک|پاور بانک|باتری|power ?bank|battery)/.test(text)) return null;
  const wattHours = numberBefore(text, /(?:وات ?ساعت|wh)(?![a-z])/);
  const mah = numberBefore(text, /(?:میلی ?آمپر(?: ?ساعت)?|mah)(?![a-z])/);
  if (wattHours === null && mah === null) return null;
  const installed = /(نصب|داخل (?:لپ ?تاپ|گوشی|دستگاه)|روی دستگاه)/.test(text);
  return {
    name: "evaluate_battery",
    input: {
      ...(wattHours !== null ? { watt_hours: wattHours } : { milliamp_hours: mah }),
      spare: !installed,
    },
  };
}

function detectExcessBaggage(text: string, context: ToolContext): PlannedCall | null {
  if (!/(اضافه ?بار|excess)/.test(text)) return null;
  const kg = numberBefore(text, /(?:کیلو(?:گرم)?|kg)/);
  if (kg === null) return null;
  const allowance = /(?:سهمیه|مجاز)\D{0,12}(\d+)/.exec(text);
  return {
    name: "excess_baggage",
    input: {
      baggage_kg: kg,
      ...(allowance
        ? { allowance_kg: Number(allowance[1]) }
        : context.flightId
          ? {}
          : { allowance_kg: 20 }),
    },
  };
}

function detectRefund(text: string, context: ToolContext): PlannedCall | null {
  if (!/(کنسل|لغو|استرداد|جریمه|refund|cancel)/.test(text)) return null;
  const hours = numberBefore(text, /(?:ساعت)/);
  const days = numberBefore(text, /(?:روز)/);
  const hoursBefore = hours ?? (days !== null ? days * 24 : null);
  const money = /(\d+(?:[.,]\d+)?)\s*(میلیون|هزار)?\s*تومان/.exec(text);
  if (context.bookingId && /(رزرو|بلیت|این)/.test(text)) {
    return { name: "refund_estimate", input: { booking_id: context.bookingId } };
  }
  if (money && hoursBefore !== null) {
    const base =
      Number(money[1]?.replace(",", ".")) *
      (money[2] === "میلیون" ? 1_000_000 : money[2] === "هزار" ? 1000 : 1);
    return {
      name: "refund_estimate",
      input: {
        base_fare_toman: base,
        hours_before_departure: hoursBefore,
        reason: /(ایرلاین|کنسل شد|لغو شد)/.test(text) ? "AIRLINE_CANCELLED" : "VOLUNTARY",
      },
    };
  }
  return null;
}

function detectPriceAdvice(text: string, context: ToolContext): PlannedCall | null {
  if (!context.flightId) return null;
  if (!/(بخرم|صبر|قیمت|ارزان|گران|buy|wait|price)/.test(text)) return null;
  return { name: "price_advice", input: { flight_id: context.flightId } };
}

function dateFrom(text: string, today: string): string | null {
  const iso = /(\d{4}-\d{2}-\d{2})/.exec(text);
  if (iso?.[1]) return iso[1];
  if (/پس ?فردا/.test(text)) return addDaysIso(today, 2);
  if (/فردا/.test(text)) return addDaysIso(today, 1);
  if (/امروز/.test(text)) return today;
  return null;
}

/** Accepts only a clear city/code match; a loose substring hit would turn any word into a route. */
function cityCode(fragment: string): string | null {
  const needle = normalizeText(fragment);
  if (needle.length < 3) return null;
  const hit = searchAirports(needle, 1)[0];
  if (!hit) return null;
  const exact = normalizeText(hit.label).startsWith(needle) || hit.code.toLowerCase() === needle;
  return exact ? hit.code : null;
}

function detectCheapest(text: string, today: string): PlannedCall | null {
  if (!/(ارزان|پرواز|بلیت|cheap)/.test(text)) return null;
  const route = /(?:از\s+)?([\p{L}‌]{2,})\s+(?:به|تا|->|→)\s+([\p{L}‌]{2,})/u.exec(text);
  if (!route?.[1] || !route[2]) return null;
  const date = dateFrom(text, today);
  if (!date) return null;
  const origin = cityCode(route[1]);
  const destination = cityCode(route[2]);
  if (!origin || !destination || origin === destination) return null;
  return { name: "cheapest_flights", input: { origin, destination, date } };
}

/** A named airport ("امام خمینی") or an IATA code in the text, where a city alone would be too loose. */
function airportNamed(fragment: string): string | null {
  const needle = normalizeText(fragment);
  if (needle.length < 3) return null;
  const hit = searchAirports(needle, 1)[0];
  const airport = hit ? getAirport(hit.code) : undefined;
  if (!airport) return null;
  const named =
    airport.code.toLowerCase() === needle || normalizeText(airport.nameFa).includes(needle);
  return named ? airport.code : null;
}

/** "From Imam Khomeini where can I fly?" — answered from the route network, never from memory. */
function detectRouteNetwork(text: string): PlannedCall | null {
  if (!/(کجا|چه مقصد|کدام مقصد|مقصد ?های|مقصدها|مسیر ?های)/.test(text)) return null;
  if (!/(پرواز|مقصد|مسیر|fly)/.test(text)) return null;
  const fragments: string[] = [];
  for (const match of text.matchAll(/(?:از|فرودگاه)\s+([\p{L}‌]+(?:\s+[\p{L}‌]+)?)/gu)) {
    const words = (match[1] ?? "").split(/\s+/).filter((word) => word !== "فرودگاه");
    if (words.length === 2) fragments.push(words.join(" "));
    if (words[0]) fragments.push(words[0]);
  }
  for (const match of text.matchAll(/([\p{L}‌]{2,}|[a-z]{3})\s+(?:به\s+)?کجا/gu)) {
    if (match[1]) fragments.push(match[1]);
  }
  for (const code of text.matchAll(/\b([a-z]{3})\b/g)) {
    if (code[1]) fragments.push(code[1]);
  }
  for (const fragment of fragments) {
    const origin = cityCode(fragment) ?? airportNamed(fragment);
    if (origin) return { name: "route_network", input: { origin } };
  }
  return null;
}

/** Returns the tool calls worth making for a message, most specific first. */
export function planOfflineCalls(
  message: string,
  context: ToolContext,
  today: string,
): PlannedCall[] {
  const text = normalizeText(normalizeDigits(message));
  const calls = [
    detectBattery(text),
    detectExcessBaggage(text, context),
    detectRefund(text, context),
    detectCheapest(text, today),
    detectRouteNetwork(text),
    detectPriceAdvice(text, context),
  ].filter((call): call is PlannedCall => call !== null);
  return calls;
}

export const CARD_TOOLS: ReadonlySet<AssistantTool> = new Set([
  "evaluate_battery",
  "excess_baggage",
  "refund_estimate",
  "price_advice",
  "cheapest_flights",
  "route_network",
]);

export function cardLead(card: AssistantCardDto): string {
  return `${card.title}${card.note ? `. ${card.note}` : ""}`;
}
