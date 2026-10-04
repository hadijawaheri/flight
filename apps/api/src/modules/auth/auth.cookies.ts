import { COOKIE_NAMES } from "@flysmart/contracts";
import type { Response } from "express";

export const ACCESS_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function setSessionCookies(res: Response, tokens: SessionTokens, isProd: boolean): void {
  const base = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" } as const;
  res.cookie(COOKIE_NAMES.access, tokens.accessToken, { ...base, maxAge: ACCESS_TTL_MS });
  res.cookie(COOKIE_NAMES.refresh, tokens.refreshToken, { ...base, maxAge: REFRESH_TTL_MS });
}

export function clearSessionCookies(res: Response, isProd: boolean): void {
  const base = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" } as const;
  res.clearCookie(COOKIE_NAMES.access, base);
  res.clearCookie(COOKIE_NAMES.refresh, base);
}
