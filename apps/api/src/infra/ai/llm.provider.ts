export type LlmContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface LlmMessage {
  role: "user" | "assistant";
  content: string | LlmContentBlock[];
}

export interface LlmTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmTool[];
  maxTokens: number;
}

export interface LlmResponse {
  content: LlmContentBlock[];
  stopReason: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** A language-model backend for the assistant. `available` is false when no key is configured. */
export abstract class LlmProvider {
  abstract readonly available: boolean;
  abstract complete(request: LlmRequest): Promise<LlmResponse>;
}
