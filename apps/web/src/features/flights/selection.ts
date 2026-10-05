import { paths } from "@/lib/paths";

import { type TripQuery, tripSearchParams } from "../search/trip-query";

/** The query string every flight page needs to keep the party size, and the trip when one is known. */
export function detailSearch(query: TripQuery, outboundId: string | null): string {
  const params = tripSearchParams(query);
  if (outboundId) params.set("out", outboundId);
  return `?${params.toString()}`;
}

export function partyParams(
  query: Pick<TripQuery, "adults" | "children" | "infants">,
): URLSearchParams {
  const params = new URLSearchParams({ adults: String(query.adults) });
  if (query.children > 0) params.set("children", String(query.children));
  if (query.infants > 0) params.set("infants", String(query.infants));
  return params;
}

export interface SelectionStep {
  /** `return` means the traveller still has to pick the way back; `checkout` ends the search. */
  next: "return" | "checkout";
  href: string;
}

/**
 * Where choosing `offerId` leads. One-way trips go straight to checkout; a round trip first needs
 * the return flight, and only then checks out with both.
 */
export function stepAfterSelecting(
  query: TripQuery,
  outboundId: string | null,
  offerId: string,
): SelectionStep {
  const party = partyParams(query);

  if (!query.returnDate) {
    party.set("outbound", offerId);
    return { next: "checkout", href: `${paths.checkoutNew}?${party.toString()}` };
  }
  if (!outboundId) {
    const params = tripSearchParams(query);
    params.set("out", offerId);
    return { next: "return", href: `${paths.flights}?${params.toString()}` };
  }
  party.set("outbound", outboundId);
  party.set("return", offerId);
  return { next: "checkout", href: `${paths.checkoutNew}?${party.toString()}` };
}
