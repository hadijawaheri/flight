import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { AppException } from "../app-exception.js";
import { ALLOW_CROSS_SITE } from "../decorators/allow-cross-site.decorator.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// "same-site" is rejected too: a sibling subdomain is not our web app
const FOREIGN_SITES = new Set(["cross-site", "same-site"]);

/**
 * Second CSRF layer after SameSite=Lax cookies. Browsers set Sec-Fetch-Site themselves and
 * scripts cannot forge it; requests without it (server-side Next calls, curl) are not browser
 * CSRF and pass through. Proxy hosts are not compared, so Worker/Caddy hops do not matter.
 */
@Injectable()
export class CrossSiteGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!UNSAFE_METHODS.has(req.method)) return true;

    const site = req.headers["sec-fetch-site"];
    if (typeof site !== "string" || !FOREIGN_SITES.has(site)) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_CROSS_SITE, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (allowed) return true;

    throw new AppException(403, "FORBIDDEN", "درخواست از سایت دیگری ارسال شده و پذیرفته نشد");
  }
}
