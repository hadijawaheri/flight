import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import type { NextFunction, Request, Response } from "express";

export const CLIENT_IP_HEADER = "x-client-ip";
export const PROXY_SECRET_HEADER = "x-api-proxy-secret";

const resolved = new WeakMap<object, string>();

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Hashing first gives equal lengths, so the comparison time says nothing about the secret
function secretMatches(sent: string | string[] | undefined, secret: string): boolean {
  return typeof sent === "string" && timingSafeEqual(digest(sent), digest(secret));
}

/**
 * The visitor's address. The web app runs on Vercel, so every request reaches us from Vercel's
 * addresses and a per-IP limit would throttle all visitors together. The web app sends the address
 * Vercel saw, and we believe it only when the request also carries the shared secret: the API's
 * hostname is public, and anyone else could put any address in that header.
 */
export function resolveClientIp(
  req: Pick<Request, "headers" | "ip">,
  secret: string | undefined,
): string {
  const claimed = req.headers[CLIENT_IP_HEADER];
  if (
    secret &&
    typeof claimed === "string" &&
    isIP(claimed) !== 0 &&
    secretMatches(req.headers[PROXY_SECRET_HEADER], secret)
  ) {
    return claimed;
  }
  return req.ip ?? "unknown";
}

export function clientIp(secret: string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    resolved.set(req, resolveClientIp(req, secret));
    next();
  };
}

/** The address worked out by the clientIp middleware, or Express's own for requests it never saw. */
export function clientIpOf(req: Pick<Request, "ip">): string {
  return resolved.get(req) ?? req.ip ?? "unknown";
}
