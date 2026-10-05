import type {
  ApiResponse,
  FareCalendarDto,
  FlightOfferDto,
  FlightSearchResultDto,
  PriceAnalysisDto,
  SeatMapDto,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  sort: string;
  airlines?: string[];
  times?: string[];
  flightType?: string;
  maxPrice?: number;
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.toString();
}

export const flightsApi = {
  search: async (params: FlightSearchParams) =>
    (await api<ApiResponse<FlightSearchResultDto>>(`/flights/search?${toQuery(params)}`)).data,
  offer: async (id: string, mix: { adults: number; children: number; infants: number }) =>
    (await api<ApiResponse<FlightOfferDto>>(`/flights/${id}?${toQuery(mix)}`)).data,
  seats: async (id: string) => (await api<ApiResponse<SeatMapDto>>(`/flights/${id}/seats`)).data,
  analysis: async (id: string) =>
    (await api<ApiResponse<PriceAnalysisDto>>(`/flights/${id}/price-analysis`)).data,
  calendar: async (params: {
    origin: string;
    destination: string;
    from: string;
    days: number;
    cabin: string;
  }) => (await api<ApiResponse<FareCalendarDto>>(`/flights/calendar?${toQuery(params)}`)).data,
};
