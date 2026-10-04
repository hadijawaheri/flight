import type {
  ApiResponse,
  CreatePassengerInput,
  PassengerDto,
  UpdatePassengerInput,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function listPassengersApi(): Promise<PassengerDto[]> {
  const res = await api<ApiResponse<PassengerDto[]>>("/passengers");
  return res.data;
}

export async function getPassengerByIdApi(id: string): Promise<PassengerDto> {
  const res = await api<ApiResponse<PassengerDto>>(`/passengers/${id}`);
  return res.data;
}

export async function createPassengerApi(input: CreatePassengerInput): Promise<PassengerDto> {
  const res = await api<ApiResponse<PassengerDto>>("/passengers", {
    method: "POST",
    json: input,
  });
  return res.data;
}

export async function updatePassengerApi(
  id: string,
  input: UpdatePassengerInput,
): Promise<PassengerDto> {
  const res = await api<ApiResponse<PassengerDto>>(`/passengers/${id}`, {
    method: "PATCH",
    json: input,
  });
  return res.data;
}

export async function deletePassengerApi(id: string): Promise<void> {
  await api(`/passengers/${id}`, {
    method: "DELETE",
  });
}
