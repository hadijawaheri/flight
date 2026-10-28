import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env.js";
import { PiiCipher } from "./pii-cipher.js";

@Global()
@Module({
  providers: [
    {
      provide: PiiCipher,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PiiCipher =>
        PiiCipher.fromEnv({
          NODE_ENV: config.get("NODE_ENV", { infer: true }),
          PII_ENCRYPTION_KEY: config.get("PII_ENCRYPTION_KEY", { infer: true }),
        }),
    },
  ],
  exports: [PiiCipher],
})
export class PiiModule {}
