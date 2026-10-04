import type { ApiResponse, RequestOtpInput, UserDto, VerifyOtpInput } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const authApi = {
  requestOtp: (input: RequestOtpInput) =>
    api<void>("/auth/otp/request", { method: "POST", json: input }),
  verifyOtp: (input: VerifyOtpInput) =>
    api<ApiResponse<{ user: UserDto }>>("/auth/otp/verify", { method: "POST", json: input }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};
