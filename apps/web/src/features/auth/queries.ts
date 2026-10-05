import { useMutation } from "@tanstack/react-query";

import { authApi } from "./api";

export function useRequestOtp() {
  return useMutation({ mutationFn: authApi.requestOtp });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: authApi.verifyOtp });
}

export function useLogout() {
  return useMutation({ mutationFn: authApi.logout });
}
