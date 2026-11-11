import { Injectable } from "@nestjs/common";
import { normalizeIp, ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

import { clientIpOf } from "../http/client-ip.js";

/** Rate limits per visitor, not per Vercel address (see common/http/client-ip.ts). */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Request): Promise<string> {
    // Same IPv6 /64 grouping as the base guard, so one host cannot rotate through its subnet
    return Promise.resolve(normalizeIp(clientIpOf(req), this.ipv6SubnetPrefix));
  }
}
