import { COOKIE_NAMES } from "@flysmart/contracts";
import type { Response } from "express";

export const ACCESS_TTL_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// A session unused for a week ends; an active one still ends 30 days after sign-in
export const SESSION_IDLE_MS = 7 * DAY_MS;
export const SESSION_ABSOLUTE_MS = 30 * DAY_MS;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function setSessionCookies(res: Response, tokens: SessionTokens, isProd: boolean): void {
  const base = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" } as const;
  res.cookie(COOKIE_NAMES.access, tokens.accessToken, { ...base, maxAge: ACCESS_TTL_MS });
  res.cookie(COOKIE_NAMES.refresh, tokens.refreshToken, {
    ...base,
    maxAge: Math.max(0, tokens.refreshExpiresAt.getTime() - Date.now()),
  });
}

export function clearSessionCookies(res: Response, isProd: boolean): void {
  const base = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" } as const;
  res.clearCookie(COOKIE_NAMES.access, base);
  res.clearCookie(COOKIE_NAMES.refresh, base);
}
