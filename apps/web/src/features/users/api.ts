import type { ApiResponse, UpdateProfileInput, UserDto } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const usersApi = {
  updateProfile: async (input: UpdateProfileInput) =>
    (await api<ApiResponse<UserDto>>("/users/me", { method: "PATCH", json: input })).data,
  deleteAccount: () => api<void>("/users/me", { method: "DELETE" }),
};
