import type {
  ApiResponse,
  DeleteAccountInput,
  UpdateProfileInput,
  UserDto,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const usersApi = {
  updateProfile: async (input: UpdateProfileInput) =>
    (await api<ApiResponse<UserDto>>("/users/me", { method: "PATCH", json: input })).data,
  requestDeleteCode: () => api<void>("/auth/reauth/request", { method: "POST" }),
  deleteAccount: (input: DeleteAccountInput) =>
    api<void>("/auth/account/delete", { method: "POST", json: input }),
  logoutEverywhere: () => api<void>("/auth/logout-all", { method: "POST" }),
};
