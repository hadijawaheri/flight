import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type FlightSearchParams, flightsApi } from "./api";

export const flightKeys = {
  all: ["flights"] as const,
  search: (params: FlightSearchParams) => [...flightKeys.all, "search", params] as const,
  offer: (id: string, adults: number, children: number, infants: number) =>
    [...flightKeys.all, "offer", id, adults, children, infants] as const,
  seats: (id: string) => [...flightKeys.all, "seats", id] as const,
  analysis: (id: string) => [...flightKeys.all, "analysis", id] as const,
  calendar: (origin: string, destination: string, from: string, cabin: string) =>
    [...flightKeys.all, "calendar", origin, destination, from, cabin] as const,
};

export function useFlightSearch(params: FlightSearchParams) {
  return useQuery({
    queryKey: flightKeys.search(params),
    queryFn: () => flightsApi.search(params),
    placeholderData: keepPreviousData,
  });
}

export function useFlightOffer(
  id: string,
  mix: { adults: number; children: number; infants: number },
  enabled = true,
) {
  return useQuery({
    enabled,
    queryKey: flightKeys.offer(id, mix.adults, mix.children, mix.infants),
    queryFn: () => flightsApi.offer(id, mix),
  });
}

export function useSeatMap(id: string, enabled = true) {
  return useQuery({
    queryKey: flightKeys.seats(id),
    queryFn: () => flightsApi.seats(id),
    enabled,
    staleTime: 0,
  });
}

export function usePriceAnalysis(id: string) {
  return useQuery({ queryKey: flightKeys.analysis(id), queryFn: () => flightsApi.analysis(id) });
}

export function useFareCalendar(params: {
  origin: string;
  destination: string;
  from: string;
  days: number;
  cabin: string;
}) {
  return useQuery({
    queryKey: flightKeys.calendar(params.origin, params.destination, params.from, params.cabin),
    queryFn: () => flightsApi.calendar(params),
    placeholderData: keepPreviousData,
  });
}
