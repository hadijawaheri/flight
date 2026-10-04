import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it.each([
    ["/dashboard/orders?x=1", "/dashboard/orders?x=1"],
    ["/", "/"],
  ])("keeps local path %s", (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    null,
    undefined,
  ])("falls back for %s", (input) => {
    expect(safeRedirect(input)).toBe("/dashboard");
  });
});
