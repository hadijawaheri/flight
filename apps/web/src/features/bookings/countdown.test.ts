import { describe, expect, it } from "vitest";

import { formatCountdown, secondsUntil } from "./countdown";

describe("countdown", () => {
  it("formats minutes and seconds with Persian digits", () => {
    expect(formatCountdown(125)).toBe("۰۲:۰۵");
    expect(formatCountdown(900)).toBe("۱۵:۰۰");
  });

  it("never goes negative", () => {
    expect(formatCountdown(-5)).toBe("۰۰:۰۰");
    expect(secondsUntil("2026-01-01T00:00:00Z", Date.parse("2026-01-01T00:00:10Z"))).toBe(0);
  });

  it("rounds partial seconds up so the hold never reads as expired early", () => {
    expect(secondsUntil("2026-01-01T00:00:10.200Z", Date.parse("2026-01-01T00:00:00Z"))).toBe(11);
  });
});
