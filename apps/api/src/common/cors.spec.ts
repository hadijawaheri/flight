import { describe, expect, it } from "vitest";

import { createOriginMatcher, isSafeOriginPattern } from "./cors.js";

describe("createOriginMatcher", () => {
  const allowed = createOriginMatcher([
    "https://flysmart.example.com",
    "https://flysmart-*-myteam.vercel.app",
  ]);

  it("matches exact origins", () => {
    expect(allowed("https://flysmart.example.com")).toBe(true);
    expect(allowed("http://flysmart.example.com")).toBe(false);
  });

  it("matches preview deployments of our team only", () => {
    expect(allowed("https://flysmart-git-feat-x-myteam.vercel.app")).toBe(true);
    expect(allowed("https://flysmart-abc123-otherteam.vercel.app")).toBe(false);
    expect(allowed("https://flysmart-a.b-myteam.vercel.app")).toBe(false);
    expect(allowed("https://flysmart-abc-myteam.vercel.app.evil.com")).toBe(false);
  });
});

describe("isSafeOriginPattern", () => {
  it("accepts exact origins and scoped wildcards", () => {
    expect(isSafeOriginPattern("http://localhost:7782")).toBe(true);
    expect(isSafeOriginPattern("https://flysmart-*-myteam.vercel.app")).toBe(true);
  });

  it("rejects wildcards that would open the API to strangers", () => {
    expect(isSafeOriginPattern("*")).toBe(false);
    expect(isSafeOriginPattern("https://*")).toBe(false);
    expect(isSafeOriginPattern("https://*.vercel.app")).toBe(false);
    expect(isSafeOriginPattern("https://*.com")).toBe(false);
    expect(isSafeOriginPattern("https://flysmart.example.com/*")).toBe(false);
  });
});
