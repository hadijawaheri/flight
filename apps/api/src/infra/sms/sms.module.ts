import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";

import type { Env } from "../../config/env.js";
import { ConsoleSmsProvider } from "./console-sms.provider.js";
import { DisabledSmsProvider } from "./disabled-sms.provider.js";
import { MelipayamakSmsProvider } from "./melipayamak-sms.provider.js";
import { SmsProvider } from "./sms.provider.js";

// An unimplemented or unconfigured provider must fail at boot, never fall back to the console.
@Global()
@Module({
  providers: [
    {
      provide: SmsProvider,
      inject: [ConfigService, PinoLogger],
      useFactory: (config: ConfigService<Env, true>, logger: PinoLogger): SmsProvider => {
        const provider = config.get("SMS_PROVIDER", { infer: true });
        if (provider === "console") return new ConsoleSmsProvider(logger);
        if (provider === "disabled") return new DisabledSmsProvider();
        if (provider === "melipayamak") {
          const apiKey = config.get("MELIPAYAMAK_API_KEY", { infer: true });
          const otpBodyId = config.get("MELIPAYAMAK_OTP_BODY_ID", { infer: true });
          if (!apiKey || !otpBodyId) {
            throw new Error("MELIPAYAMAK_API_KEY and MELIPAYAMAK_OTP_BODY_ID are required");
          }
          const alertBodyId = config.get("MELIPAYAMAK_ALERT_BODY_ID", { infer: true });
          const from = config.get("MELIPAYAMAK_FROM", { infer: true });
          if (!alertBodyId && !from) {
            logger.warn(
              "No price-alert SMS channel: set MELIPAYAMAK_ALERT_BODY_ID (or MELIPAYAMAK_FROM)",
            );
          }
          return new MelipayamakSmsProvider({ apiKey, otpBodyId, alertBodyId, from }, logger);
        }
        throw new Error(`SMS provider "${provider}" is not implemented yet`);
      },
    },
  ],
  exports: [SmsProvider],
})
export class SmsModule {}
