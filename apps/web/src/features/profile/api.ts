import type { ApiResponse, UpdateProfileInput, UserDto } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const profileApi = {
  update: (input: UpdateProfileInput) =>
    api<ApiResponse<UserDto>>("/users/me", { method: "PATCH", json: input }),
};
