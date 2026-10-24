import { describe, expect, it } from "vitest";

import { resolveApiOrigin } from "./api-origin";

describe("resolveApiOrigin", () => {
  it("falls back to the local API outside Vercel", () => {
    expect(resolveApiOrigin({})).toBe("http://localhost:7781");
  });

  it("prefers INTERNAL_API_URL, then NEXT_PUBLIC_API_URL, and drops trailing slashes", () => {
    expect(resolveApiOrigin({ NEXT_PUBLIC_API_URL: "https://api.example.com/" })).toBe(
      "https://api.example.com",
    );
    expect(
      resolveApiOrigin({
        INTERNAL_API_URL: "http://127.0.0.1:7791",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
      }),
    ).toBe("http://127.0.0.1:7791");
  });

  it("refuses to build for Vercel without an API origin", () => {
    expect(() => resolveApiOrigin({ VERCEL: "1" })).toThrow(/NEXT_PUBLIC_API_URL/);
    expect(resolveApiOrigin({ VERCEL: "1", NEXT_PUBLIC_API_URL: "https://api.example.com" })).toBe(
      "https://api.example.com",
    );
  });
});
