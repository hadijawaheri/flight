import { useMutation, useQuery } from "@tanstack/react-query";

import { assistantApi } from "./api";

export function useAssistantStatus() {
  return useQuery({
    queryKey: ["assistant", "status"],
    queryFn: assistantApi.status,
    staleTime: 10 * 60_000,
  });
}

export function useAskAssistant() {
  return useMutation({ mutationFn: assistantApi.ask });
}
