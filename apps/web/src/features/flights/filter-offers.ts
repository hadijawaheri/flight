import type { FlightOfferDto, FlightSort, FlightType, TimeBucket } from "@flysmart/contracts";

export interface OfferFilters {
  sort: FlightSort;
  airlines: string[];
  times: TimeBucket[];
  type: FlightType | null;
  /** Upper bound on the per-adult total, rial. */
  maxPrice: number | null;
}

export const EMPTY_FILTERS: OfferFilters = {
  sort: "best",
  airlines: [],
  times: [],
  type: null,
  maxPrice: null,
};

/** Same four buckets the API understands, taken from the wall clock at the origin airport. */
export function timeBucketOfOffer(offer: FlightOfferDto): TimeBucket {
  const hour = Number(offer.origin.localTime.slice(11, 13));
  if (hour < 6) return "NIGHT";
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

/**
 * Filtering happens in the browser on the full result set: facets stay stable while the traveller
 * narrows down, and every change is instant instead of another round trip.
 */
export function applyFilters(
  offers: readonly FlightOfferDto[],
  filters: OfferFilters,
): FlightOfferDto[] {
  const filtered = offers.filter((offer) => {
    if (filters.airlines.length > 0 && !filters.airlines.includes(offer.airline.code)) return false;
    if (filters.times.length > 0 && !filters.times.includes(timeBucketOfOffer(offer))) return false;
    if (filters.type && offer.flightType !== filters.type) return false;
    if (filters.maxPrice !== null && offer.pricePerAdult > filters.maxPrice) return false;
    return true;
  });

  // "best" is the API's own ranking and is already the order of the input.
  if (filters.sort === "best") return filtered;
  const key: Record<Exclude<FlightSort, "best">, (offer: FlightOfferDto) => number> = {
    price: (offer) => offer.pricePerAdult,
    departure: (offer) => Date.parse(offer.departureUtc),
    duration: (offer) => offer.durationMinutes,
  };
  const pick = key[filters.sort];
  return [...filtered].sort((a, b) => pick(a) - pick(b) || a.pricePerAdult - b.pricePerAdult);
}

export function countByTimeBucket(offers: readonly FlightOfferDto[]): Record<TimeBucket, number> {
  const counts: Record<TimeBucket, number> = { NIGHT: 0, MORNING: 0, AFTERNOON: 0, EVENING: 0 };
  for (const offer of offers) counts[timeBucketOfOffer(offer)] += 1;
  return counts;
}

export function activeFilterCount(filters: OfferFilters): number {
  return (
    (filters.airlines.length > 0 ? 1 : 0) +
    (filters.times.length > 0 ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0)
  );
}
