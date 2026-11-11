import type { Request } from "express";
import { describe, expect, it } from "vitest";

import {
  CLIENT_IP_HEADER,
  clientIp,
  clientIpOf,
  PROXY_SECRET_HEADER,
  resolveClientIp,
} from "./client-ip.js";

const SECRET = "a-shared-secret-that-is-long-enough-1234";
const VERCEL = "76.76.21.21";

function req(headers: Record<string, string> = {}): Pick<Request, "headers" | "ip"> {
  return { headers, ip: VERCEL };
}

describe("resolveClientIp", () => {
  it("uses the web app's address when the secret matches", () => {
    const headers = { [CLIENT_IP_HEADER]: "5.160.1.2", [PROXY_SECRET_HEADER]: SECRET };
    expect(resolveClientIp(req(headers), SECRET)).toBe("5.160.1.2");
  });

  it("accepts IPv6 addresses", () => {
    const headers = { [CLIENT_IP_HEADER]: "2a01:5ec0::1", [PROXY_SECRET_HEADER]: SECRET };
    expect(resolveClientIp(req(headers), SECRET)).toBe("2a01:5ec0::1");
  });

  it("ignores the header without the secret, with a wrong one, or when none is configured", () => {
    expect(resolveClientIp(req({ [CLIENT_IP_HEADER]: "1.2.3.4" }), SECRET)).toBe(VERCEL);
    const wrong = { [CLIENT_IP_HEADER]: "1.2.3.4", [PROXY_SECRET_HEADER]: "guess" };
    expect(resolveClientIp(req(wrong), SECRET)).toBe(VERCEL);
    const sent = { [CLIENT_IP_HEADER]: "1.2.3.4", [PROXY_SECRET_HEADER]: SECRET };
    expect(resolveClientIp(req(sent), undefined)).toBe(VERCEL);
  });

  it("ignores a value that is not an IP address", () => {
    const headers = { [CLIENT_IP_HEADER]: "1.2.3.4, 5.6.7.8", [PROXY_SECRET_HEADER]: SECRET };
    expect(resolveClientIp(req(headers), SECRET)).toBe(VERCEL);
  });
});

describe("clientIp middleware", () => {
  it("remembers the resolved address for the throttler", () => {
    const request = {
      headers: { [CLIENT_IP_HEADER]: "5.160.1.2", [PROXY_SECRET_HEADER]: SECRET },
      ip: VERCEL,
    } as unknown as Request;
    let called = false;
    clientIp(SECRET)(request, {} as never, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(clientIpOf(request)).toBe("5.160.1.2");
  });

  it("falls back to Express's address for a request it never saw", () => {
    expect(clientIpOf({ ip: VERCEL })).toBe(VERCEL);
  });
});
