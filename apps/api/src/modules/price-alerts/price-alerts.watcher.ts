import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";

import type { Env } from "../../config/env.js";
import { PriceAlertsService } from "./price-alerts.service.js";

const CHECK_INTERVAL_MS = 15 * 60_000;

/** Periodically re-prices every active alert. Disabled with ALERTS_WATCHER_ENABLED=false. */
@Injectable()
export class PriceAlertsWatcher implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly alerts: PriceAlertsService,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    if (!this.config.get("ALERTS_WATCHER_ENABLED", { infer: true })) return;
    this.timer = setInterval(() => {
      this.alerts
        .checkAll()
        .then((outcome) => this.logger.info(outcome, "Price alert sweep finished"))
        .catch((error: unknown) => this.logger.error({ err: error }, "Price alert sweep failed"));
    }, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
