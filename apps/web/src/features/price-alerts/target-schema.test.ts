import { describe, expect, it } from "vitest";

import { targetFormSchema } from "./target-schema";

describe("targetFormSchema", () => {
  it("reads Persian digits and separators", () => {
    const parsed = targetFormSchema.safeParse({ targetToman: "۳٬۵۰۰٬۰۰۰" });
    expect(parsed.success && parsed.data.targetToman).toBe(3_500_000);
  });

  it("rejects text and tiny amounts", () => {
    expect(targetFormSchema.safeParse({ targetToman: "abc" }).success).toBe(false);
    expect(targetFormSchema.safeParse({ targetToman: "500" }).success).toBe(false);
  });
});
