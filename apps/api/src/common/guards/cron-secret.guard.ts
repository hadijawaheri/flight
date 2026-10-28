import { timingSafeEqual } from "node:crypto";

import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import type { Env } from "../../config/env.js";
import { AppException } from "../app-exception.js";

/**
 * Lets a scheduler (Vercel Cron, GitHub Actions) run background sweeps over HTTP. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`. Without a secret the routes do not exist, so a deploy that
 * never configured a scheduler exposes nothing.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const secret = this.config.get("CRON_SECRET", { infer: true });
    if (!secret) throw new AppException(404, "NOT_FOUND", "مسیر پیدا نشد");

    const header = ctx.switchToHttp().getRequest<Request>().headers.authorization ?? "";
    const given = Buffer.from(header);
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
    throw new AppException(401, "UNAUTHENTICATED", "کلید زمان‌بند نادرست است");
  }
}
