import { describe, expect, it } from "vitest";

import { buildCsp, createNonce } from "./csp";

describe("csp", () => {
  it("only allows scripts carrying this request's nonce in production", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("relaxes only what the dev server needs", () => {
    const csp = buildCsp("abc", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("makes a fresh nonce each time", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
