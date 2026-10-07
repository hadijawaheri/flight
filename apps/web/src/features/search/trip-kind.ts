import {
  airportServes,
  airportsServing,
  destinationsFrom,
  type RouteKind,
  routeKindBetween,
  searchAirports,
} from "@flysmart/contracts";

/** Where each kind of trip starts when the traveller has not picked an origin that fits it. */
export const DEFAULT_ORIGIN: Record<RouteKind, string> = {
  DOMESTIC: "THR",
  // Tehran has two airports and only Imam Khomeini really flies abroad; the group covers both
  INTERNATIONAL: "TEH",
};

export const otherKind = (kind: RouteKind): RouteKind =>
  kind === "DOMESTIC" ? "INTERNATIONAL" : "DOMESTIC";

/** Airports offered for the origin field: those that fly to the chosen destination, or any that fly this kind. */
export function allowedOrigins(kind: RouteKind, destination: string): string[] {
  return destination
    ? destinationsFrom(destination, kind)
    : airportsServing(kind).map((airport) => airport.code);
}

/** Airports offered for the destination field. Routes are symmetric, so this mirrors `allowedOrigins`. */
export function allowedDestinations(kind: RouteKind, origin: string): string[] {
  return allowedOrigins(kind, origin);
}

export function kindOfTrip(origin: string, destination: string): RouteKind {
  return routeKindBetween(origin, destination) ?? "DOMESTIC";
}

function originFor(kind: RouteKind, origin: string): string {
  if (!origin) return DEFAULT_ORIGIN[kind];
  if (kind === "INTERNATIONAL" && (origin === "THR" || origin === "IKA")) return "TEH";
  if (kind === "DOMESTIC" && (origin === "TEH" || origin === "IKA")) return "THR";
  return airportServes(origin, kind) ? origin : DEFAULT_ORIGIN[kind];
}

/** What a trip's two ends become when the kind changes: keep what still flies, replace or clear the rest. */
export function retarget(
  kind: RouteKind,
  ends: { origin: string; destination: string },
): { origin: string; destination: string } {
  const origin = originFor(kind, ends.origin);
  const destination =
    ends.destination && routeKindBetween(origin, ends.destination) === kind ? ends.destination : "";
  return { origin, destination };
}

/** An airport the typed text matches that only flies the other kind, so the form can offer to switch. */
export function matchInOtherKind(
  query: string,
  kind: RouteKind,
): { code: string; label: string } | null {
  if (query.trim() === "") return null;
  const other = otherKind(kind);
  const [hit] = searchAirports(
    query,
    1,
    airportsServing(other).map((airport) => airport.code),
  );
  return hit ? { code: hit.code, label: hit.label } : null;
}
