import { COOKIE_NAMES } from "@flysmart/contracts";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveApiOrigin } from "@/lib/api-origin";
import { buildCsp, createNonce, NONCE_HEADER } from "@/lib/csp";

const API_ORIGIN = resolveApiOrigin();
const PROTECTED_PREFIXES = ["/dashboard", "/checkout"];

function redirectToSignIn(request: NextRequest): NextResponse {
  const url = new URL("/sign-in", request.url);
  // Keep the query: /checkout/new is meaningless without the flights it was opened with.
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  response.cookies.delete(COOKIE_NAMES.access);
  response.cookies.delete(COOKIE_NAMES.refresh);
  return response;
}

// Server Components cannot set cookies, so an expired access token is rotated here
async function refreshAndContinue(request: NextRequest, forwarded: Headers): Promise<NextResponse> {
  const res = await fetch(`${API_ORIGIN}/v1/auth/refresh`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return redirectToSignIn(request);

  const setCookies = res.headers.getSetCookie();
  const jar = new Map(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
  for (const line of setCookies) {
    const pair = line.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
  }

  // The same request must see the fresh tokens, the browser gets them via Set-Cookie
  const headers = new Headers(forwarded);
  headers.set("cookie", [...jar].map(([name, value]) => `${name}=${value}`).join("; "));
  const response = NextResponse.next({ request: { headers } });
  for (const line of setCookies) response.headers.append("set-cookie", line);
  return response;
}

// Optimistic check only: real authorization lives in the API guards and the server-side DAL
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const forwarded = new Headers(request.headers);
  forwarded.set(NONCE_HEADER, nonce);
  forwarded.set("content-security-policy", csp);

  const response = await route(request, forwarded);
  response.headers.set("content-security-policy", csp);
  return response;
}

async function route(request: NextRequest, forwarded: Headers): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hasAccess = request.cookies.has(COOKIE_NAMES.access);
  const hasRefresh = request.cookies.has(COOKIE_NAMES.refresh);
  const next = () => NextResponse.next({ request: { headers: forwarded } });

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (hasAccess) return next();
    if (hasRefresh) return refreshAndContinue(request, forwarded);
    return redirectToSignIn(request);
  }

  if (pathname === "/sign-in" && (hasAccess || hasRefresh)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
