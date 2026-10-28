import { randomUUID } from "node:crypto";

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { stdTimeFunctions } from "pino";

import { ClockModule } from "./common/clock/clock.module.js";
import { PiiModule } from "./common/crypto/pii.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { CrossSiteGuard } from "./common/guards/cross-site.guard.js";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard.js";
import { RolesGuard } from "./common/guards/roles.guard.js";
import { ZodValidationPipe } from "./common/zod/zod-validation.pipe.js";
import type { Env } from "./config/env.js";
import { validateEnv } from "./config/env.js";
import { HealthModule } from "./health/health.module.js";
import { LlmModule } from "./infra/ai/llm.module.js";
import { FlightProviderModule } from "./infra/flight/flight-provider.module.js";
import { PaymentProviderModule } from "./infra/payment/payment-provider.module.js";
import { SmsModule } from "./infra/sms/sms.module.js";
import { AssistantModule } from "./modules/assistant/assistant.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BookingsModule } from "./modules/bookings/bookings.module.js";
import { DealsModule } from "./modules/deals/deals.module.js";
import { FlightsModule } from "./modules/flights/flights.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module.js";
import { PassengersModule } from "./modules/passengers/passengers.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { PriceAlertsModule } from "./modules/price-alerts/price-alerts.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const nodeEnv = config.get("NODE_ENV", { infer: true });
        return {
          pinoHttp: {
            level: nodeEnv === "test" ? "silent" : "info",
            // Readable in PM2 log files and sortable by any log shipper
            timestamp: stdTimeFunctions.isoTime,
            genReqId: (req, res) => {
              const incoming = req.headers["x-request-id"];
              const id = typeof incoming === "string" ? incoming : randomUUID();
              res.setHeader("x-request-id", id);
              return id;
            },
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
            ],
            transport: nodeEnv === "development" ? { target: "pino-pretty" } : undefined,
          },
        };
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get("DATABASE_URL", { infer: true }),
        // Production indexes are created by migrations, never at boot
        autoIndex: config.get("NODE_ENV", { infer: true }) !== "production",
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        skipIf: () => !config.get("THROTTLE_ENABLED", { infer: true }),
      }),
    }),
    JwtModule.register({ global: true }),
    ClockModule,
    PiiModule,
    FlightProviderModule,
    PaymentProviderModule,
    LlmModule,
    SmsModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PassengersModule,
    FlightsModule,
    DealsModule,
    PriceAlertsModule,
    BookingsModule,
    PaymentsModule,
    KnowledgeModule,
    AssistantModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: CrossSiteGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
