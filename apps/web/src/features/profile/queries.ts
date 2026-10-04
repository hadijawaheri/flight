import { useMutation } from "@tanstack/react-query";

import { profileApi } from "./api";

export function useUpdateProfile() {
  return useMutation({ mutationFn: profileApi.update });
}
