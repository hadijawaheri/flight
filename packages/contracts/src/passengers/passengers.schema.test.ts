import { describe, expect, it } from "vitest";

import { createPassengerSchema, updatePassengerSchema } from "./passengers.schema";

const passenger = {
  firstNameFa: "علی",
  lastNameFa: "محمدی",
  firstNameEn: "Ali",
  lastNameEn: "Mohammadi",
  nationalId: "0499370899",
  birthDate: "1990-05-15",
  gender: "MALE",
} as const;

describe("createPassengerSchema", () => {
  it("normalises Persian digits and upper-cases latin names", () => {
    const parsed = createPassengerSchema.parse({ ...passenger, nationalId: "۰۴۹۹۳۷۰۸۹۹" });
    expect(parsed.nationalId).toBe("0499370899");
    expect(parsed.firstNameEn).toBe("ALI");
    expect(parsed.isDefault).toBe(false);
  });

  it("rejects non-latin english names and invalid national codes", () => {
    expect(createPassengerSchema.safeParse({ ...passenger, firstNameEn: "علی" }).success).toBe(
      false,
    );
    expect(createPassengerSchema.safeParse({ ...passenger, nationalId: "123456" }).success).toBe(
      false,
    );
  });

  it("rejects impossible birth dates (future, or older than 120 years)", () => {
    const future = createPassengerSchema.safeParse({ ...passenger, birthDate: "2999-01-01" });
    expect(future.success).toBe(false);
    if (!future.success) expect(future.error.issues[0]?.message).toContain("آینده");
    expect(createPassengerSchema.safeParse({ ...passenger, birthDate: "1700-01-01" }).success).toBe(
      false,
    );
    expect(createPassengerSchema.safeParse({ ...passenger, birthDate: "2020-02-29" }).success).toBe(
      true,
    );
  });

  it("keeps isDefault untouched on partial updates", () => {
    const parsed = updatePassengerSchema.parse({ firstNameFa: "رضا" });
    expect("isDefault" in parsed).toBe(false);
  });
});
