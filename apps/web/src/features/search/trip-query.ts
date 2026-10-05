import type { Cabin } from "@flysmart/contracts";
import { isoDateSchema, searchFlightsQuerySchema } from "@flysmart/contracts";

/** What a traveller is looking for; lives in the URL so results can be shared and reloaded. */
export interface TripQuery {
  origin: string;
  destination: string;
  date: string;
  /** Present for round trips. */
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
}

export type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Null when the URL does not describe a valid search; the caller then shows the empty form. */
export function parseTripQuery(params: RawParams): TripQuery | null {
  const parsed = searchFlightsQuerySchema.safeParse({
    origin: first(params.origin),
    destination: first(params.destination),
    date: first(params.date),
    adults: first(params.adults),
    children: first(params.children),
    infants: first(params.infants),
    cabin: first(params.cabin),
  });
  if (!parsed.success) return null;

  const rawReturn = first(params.return);
  const returnDate = rawReturn ? isoDateSchema.safeParse(rawReturn) : null;
  if (returnDate && (!returnDate.success || returnDate.data < parsed.data.date)) return null;

  return {
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    date: parsed.data.date,
    ...(returnDate?.success ? { returnDate: returnDate.data } : {}),
    adults: parsed.data.adults,
    children: parsed.data.children,
    infants: parsed.data.infants,
    cabin: parsed.data.cabin,
  };
}

export function tripSearchParams(query: TripQuery): URLSearchParams {
  const params = new URLSearchParams({
    origin: query.origin,
    destination: query.destination,
    date: query.date,
    adults: String(query.adults),
  });
  if (query.children > 0) params.set("children", String(query.children));
  if (query.infants > 0) params.set("infants", String(query.infants));
  if (query.cabin !== "ECONOMY") params.set("cabin", query.cabin);
  if (query.returnDate) params.set("return", query.returnDate);
  return params;
}

export type TripLeg = "OUTBOUND" | "RETURN";

/** The route and day of one leg; the return leg flies the same route backwards. */
export function legOf(
  query: TripQuery,
  leg: TripLeg,
): { origin: string; destination: string; date: string } {
  return leg === "OUTBOUND" || !query.returnDate
    ? { origin: query.origin, destination: query.destination, date: query.date }
    : { origin: query.destination, destination: query.origin, date: query.returnDate };
}

export function mixOf(query: TripQuery): { adults: number; children: number; infants: number } {
  return { adults: query.adults, children: query.children, infants: query.infants };
}
