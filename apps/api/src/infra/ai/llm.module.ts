import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { AnthropicLlmProvider } from "./anthropic-llm.provider.js";
import { LlmProvider } from "./llm.provider.js";
import { NullLlmProvider } from "./null-llm.provider.js";

@Global()
@Module({
  providers: [
    {
      provide: LlmProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): LlmProvider => {
        const apiKey = config.get("ANTHROPIC_API_KEY", { infer: true });
        if (!apiKey) return new NullLlmProvider();
        return new AnthropicLlmProvider({
          apiKey,
          model: config.get("ANTHROPIC_MODEL", { infer: true }),
          baseUrl: config.get("ANTHROPIC_BASE_URL", { infer: true }).replace(/\/$/, ""),
          timeoutMs: config.get("ASSISTANT_TIMEOUT_MS", { infer: true }),
        });
      },
    },
  ],
  exports: [LlmProvider],
})
export class LlmModule {}
