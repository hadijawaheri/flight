import type { LlmResponse } from "./llm.provider.js";
import { LlmError, LlmProvider } from "./llm.provider.js";

/** Used when ANTHROPIC_API_KEY is absent: the assistant then runs on the knowledge base alone. */
export class NullLlmProvider extends LlmProvider {
  readonly available = false;

  complete(): Promise<LlmResponse> {
    return Promise.reject(new LlmError("No language model is configured"));
  }
}
