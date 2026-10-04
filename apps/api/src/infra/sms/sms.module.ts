import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";

import type { Env } from "../../config/env.js";
import { ConsoleSmsProvider } from "./console-sms.provider.js";
import { SmsProvider } from "./sms.provider.js";

// Add a real provider class here (e.g. MelipayamakSmsProvider) and map it by SMS_PROVIDER.
// An unimplemented provider must fail at boot, never silently fall back to the console.
@Global()
@Module({
  providers: [
    {
      provide: SmsProvider,
      inject: [ConfigService, PinoLogger],
      useFactory: (config: ConfigService<Env, true>, logger: PinoLogger): SmsProvider => {
        const provider = config.get("SMS_PROVIDER", { infer: true });
        if (provider === "console") return new ConsoleSmsProvider(logger);
        throw new Error(`SMS provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [SmsProvider],
})
export class SmsModule {}
