import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from "@nestjs/terminus";

import { Public } from "../common/decorators/public.decorator.js";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Public()
  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Public()
  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([() => this.mongoose.pingCheck("mongo")]);
  }
}
