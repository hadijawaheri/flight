import type { AskAssistantInput } from "@flysmart/contracts";
import { useMutation } from "@tanstack/react-query";

import { askAssistantApi } from "./api";

export function useAskAssistant() {
  return useMutation({
    mutationFn: (input: AskAssistantInput) => askAssistantApi(input),
  });
}
