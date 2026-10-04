import type {
  ApiResponse,
  FareMatrixItemDto,
  FareMatrixQuery,
  FlightDto,
  FlightSearchQuery,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function searchFlightsApi(query: FlightSearchQuery): Promise<FlightDto[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("origin", query.origin);
  searchParams.set("destination", query.destination);
  searchParams.set("departureDate", query.departureDate);
  if (query.returnDate) searchParams.set("returnDate", query.returnDate);
  if (query.adults) searchParams.set("adults", String(query.adults));
  if (query.children) searchParams.set("children", String(query.children));
  if (query.infants) searchParams.set("infants", String(query.infants));
  if (query.flightClass) searchParams.set("flightClass", query.flightClass);
  if (query.isCharter !== undefined) searchParams.set("isCharter", String(query.isCharter));
  if (query.airline) searchParams.set("airline", query.airline);
  if (query.maxPrice) searchParams.set("maxPrice", String(query.maxPrice));
  if (query.sortBy) searchParams.set("sortBy", query.sortBy);

  const res = await api<ApiResponse<FlightDto[]>>(`/flights/search?${searchParams.toString()}`);
  return res.data;
}

export async function getFlightByIdApi(id: string): Promise<FlightDto> {
  const res = await api<ApiResponse<FlightDto>>(`/flights/${id}`);
  return res.data;
}

export async function getFareMatrixApi(query: FareMatrixQuery): Promise<FareMatrixItemDto[]> {
  const searchParams = new URLSearchParams({
    origin: query.origin,
    destination: query.destination,
    startDate: query.startDate,
    days: String(query.days ?? 7),
  });

  const res = await api<ApiResponse<FareMatrixItemDto[]>>(
    `/flights/fare-matrix?${searchParams.toString()}`,
  );
  return res.data;
}
