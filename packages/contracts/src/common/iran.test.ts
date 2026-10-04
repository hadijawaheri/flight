import { describe, expect, it } from "vitest";

import { normalizeDigits } from "./digits";
import { isValidNationalCode, mobileSchema } from "./iran";

describe("normalizeDigits", () => {
  it.each([
    ["۰۹۱۲۳۴۵۶۷۸۹", "09123456789"],
    ["٠٩١٢٣٤٥٦٧٨٩", "09123456789"],
    ["09abc۱", "09abc1"],
    ["", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeDigits(input)).toBe(expected);
  });
});

describe("mobileSchema", () => {
  it("accepts persian digits and trims", () => {
    expect(mobileSchema.parse(" ۰۹۱۲۳۴۵۶۷۸۹ ")).toBe("09123456789");
  });
  it.each(["0912345678", "08123456789", "09123456789a", ""])("rejects %s", (v) => {
    expect(mobileSchema.safeParse(v).success).toBe(false);
  });
});

describe("isValidNationalCode", () => {
  it.each(["0499370899", "0684159414", "1111111112".slice(0, 0) + "0013542419"])(
    "accepts %s",
    (c) => {
      expect(isValidNationalCode(c)).toBe(true);
    },
  );
  it.each(["1111111111", "0499370898", "123", "abcdefghij", "049937089"])("rejects %s", (c) => {
    expect(isValidNationalCode(c)).toBe(false);
  });
});
