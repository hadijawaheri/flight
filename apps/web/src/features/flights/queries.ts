import type { FareMatrixQuery, FlightSearchQuery } from "@flysmart/contracts";
import { useQuery } from "@tanstack/react-query";

import { getFareMatrixApi, getFlightByIdApi, searchFlightsApi } from "./api";

export const flightKeys = {
  all: ["flights"] as const,
  searches: () => [...flightKeys.all, "search"] as const,
  search: (query: FlightSearchQuery) => [...flightKeys.searches(), query] as const,
  detail: (id: string) => [...flightKeys.all, "detail", id] as const,
  matrix: (query: FareMatrixQuery) => [...flightKeys.all, "matrix", query] as const,
};

export function useFlightSearch(query: FlightSearchQuery | null, enabled = true) {
  return useQuery({
    queryKey: query ? flightKeys.search(query) : ["flights", "search", "empty"],
    queryFn: () => (query ? searchFlightsApi(query) : Promise.resolve([])),
    enabled: Boolean(query && enabled),
    staleTime: 60_000,
  });
}

export function useFlightDetail(id: string) {
  return useQuery({
    queryKey: flightKeys.detail(id),
    queryFn: () => getFlightByIdApi(id),
    enabled: Boolean(id),
  });
}

export function useFareMatrix(query: FareMatrixQuery | null, enabled = true) {
  return useQuery({
    queryKey: query ? flightKeys.matrix(query) : ["flights", "matrix", "empty"],
    queryFn: () => (query ? getFareMatrixApi(query) : Promise.resolve([])),
    enabled: Boolean(query && enabled),
    staleTime: 120_000,
  });
}
