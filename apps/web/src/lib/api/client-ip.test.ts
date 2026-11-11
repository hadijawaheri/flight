import { describe, expect, it } from "vitest";

import { clientIpHeaders, visitorIp, withClientIp } from "./client-ip";

const SECRET = "a-shared-secret-that-is-long-enough-1234";

describe("visitorIp", () => {
  it("takes the first X-Forwarded-For entry, then X-Real-IP", () => {
    expect(visitorIp(new Headers({ "x-forwarded-for": "5.160.1.2, 10.0.0.1" }))).toBe("5.160.1.2");
    expect(visitorIp(new Headers({ "x-real-ip": "5.160.1.3" }))).toBe("5.160.1.3");
    expect(visitorIp(new Headers())).toBeUndefined();
  });
});

describe("clientIpHeaders", () => {
  it("sends the address with the secret", () => {
    const incoming = new Headers({ "x-forwarded-for": "5.160.1.2" });
    expect(clientIpHeaders(incoming, SECRET)).toEqual({
      "x-client-ip": "5.160.1.2",
      "x-api-proxy-secret": SECRET,
    });
  });

  it("sends nothing without a secret or an address", () => {
    expect(clientIpHeaders(new Headers({ "x-forwarded-for": "5.160.1.2" }), "")).toEqual({});
    expect(clientIpHeaders(new Headers(), SECRET)).toEqual({});
  });
});

describe("withClientIp", () => {
  it("replaces headers a visitor sent themselves", () => {
    const incoming = new Headers({
      "x-forwarded-for": "5.160.1.2",
      "x-client-ip": "1.1.1.1",
      "x-api-proxy-secret": "forged",
      cookie: "a=b",
    });
    const out = withClientIp(incoming, SECRET);
    expect(out.get("x-client-ip")).toBe("5.160.1.2");
    expect(out.get("x-api-proxy-secret")).toBe(SECRET);
    expect(out.get("cookie")).toBe("a=b");
  });

  it("drops forged headers when no secret is configured", () => {
    const incoming = new Headers({ "x-client-ip": "1.1.1.1", "x-api-proxy-secret": "forged" });
    const out = withClientIp(incoming, "");
    expect(out.has("x-client-ip")).toBe(false);
    expect(out.has("x-api-proxy-secret")).toBe(false);
  });
});
