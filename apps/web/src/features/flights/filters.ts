"use client";

import { FLIGHT_SORTS, FLIGHT_TYPES, TIME_BUCKETS } from "@flysmart/contracts";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs";

import type { OfferFilters } from "./filter-offers";

const parsers = {
  sort: parseAsStringLiteral(FLIGHT_SORTS).withDefault("best"),
  airlines: parseAsArrayOf(parseAsString).withDefault([]),
  times: parseAsArrayOf(parseAsStringLiteral(TIME_BUCKETS)).withDefault([]),
  type: parseAsStringLiteral(FLIGHT_TYPES),
  max: parseAsInteger,
};

/** Filters live in the URL (replace, not push) so a filtered view can be shared without cluttering history. */
export function useOfferFilters(): [
  OfferFilters,
  (patch: Partial<OfferFilters>) => void,
  () => void,
] {
  const [state, setState] = useQueryStates(parsers, { history: "replace", clearOnDefault: true });

  const filters: OfferFilters = {
    sort: state.sort,
    airlines: state.airlines,
    times: state.times,
    type: state.type,
    maxPrice: state.max,
  };

  const update = (patch: Partial<OfferFilters>) => {
    void setState({
      ...(patch.sort !== undefined ? { sort: patch.sort } : {}),
      ...(patch.airlines !== undefined ? { airlines: patch.airlines } : {}),
      ...(patch.times !== undefined ? { times: patch.times } : {}),
      ...("type" in patch ? { type: patch.type ?? null } : {}),
      ...("maxPrice" in patch ? { max: patch.maxPrice ?? null } : {}),
    });
  };
  const reset = () => void setState({ airlines: null, times: null, type: null, max: null });

  return [filters, update, reset];
}

/** The chosen outbound flight of a round trip; pushing makes the browser back button undo it. */
export function useOutboundSelection() {
  return useQueryState("out", parseAsString.withOptions({ history: "push" }));
}
