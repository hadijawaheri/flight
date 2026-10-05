import type {
  ApiResponse,
  CreatePassengerInput,
  PassengerDto,
  UpdatePassengerInput,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const passengersApi = {
  list: async () => (await api<ApiResponse<PassengerDto[]>>("/passengers")).data,
  create: async (input: CreatePassengerInput) =>
    (await api<ApiResponse<PassengerDto>>("/passengers", { method: "POST", json: input })).data,
  update: async (id: string, input: UpdatePassengerInput) =>
    (await api<ApiResponse<PassengerDto>>(`/passengers/${id}`, { method: "PATCH", json: input }))
      .data,
  remove: (id: string) => api<void>(`/passengers/${id}`, { method: "DELETE" }),
};
