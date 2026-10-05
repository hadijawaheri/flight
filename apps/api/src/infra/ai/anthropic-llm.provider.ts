import type { LlmContentBlock, LlmRequest, LlmResponse } from "./llm.provider.js";
import { LlmError, LlmProvider } from "./llm.provider.js";

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

interface AnthropicMessageResponse {
  content?: LlmContentBlock[];
  stop_reason?: string;
  error?: { message?: string };
}

/** Talks to the Anthropic Messages API over plain fetch; no SDK dependency. */
export class AnthropicLlmProvider extends LlmProvider {
  readonly available = true;

  constructor(private readonly options: AnthropicOptions) {
    super();
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.options.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: request.messages,
          ...(request.tools.length > 0 ? { tools: request.tools } : {}),
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error: unknown) {
      throw new LlmError(error instanceof Error ? error.message : "request failed");
    }

    const body = (await response.json().catch(() => ({}))) as AnthropicMessageResponse;
    if (!response.ok) {
      throw new LlmError(
        body.error?.message ?? `Anthropic API returned ${response.status}`,
        response.status,
      );
    }
    return { content: body.content ?? [], stopReason: body.stop_reason ?? "end_turn" };
  }
}
