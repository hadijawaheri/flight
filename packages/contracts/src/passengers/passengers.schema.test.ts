import { describe, expect, it } from "vitest";

import { createPassengerSchema, updatePassengerSchema } from "./passengers.schema";

describe("createPassengerSchema", () => {
  const validPassenger = {
    firstNameFa: "علی",
    lastNameFa: "محمدی",
    firstNameEn: "Ali",
    lastNameEn: "Mohammadi",
    nationalId: "0499370899",
    birthDate: "1990-05-15",
    gender: "MALE",
    passengerType: "ADULT",
    passportNumber: "A12345678",
    passportExpiry: "2028-10-20",
    isDefault: true,
  };

  it("validates a complete valid passenger input", () => {
    const result = createPassengerSchema.safeParse(validPassenger);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstNameEn).toBe("Ali");
      expect(result.data.nationalId).toBe("0499370899");
    }
  });

  it("handles Persian digits in national ID and converts them", () => {
    const inputWithPersianDigits = {
      ...validPassenger,
      nationalId: "۰۴۹۹۳۷۰۸۹۹",
    };
    const result = createPassengerSchema.safeParse(inputWithPersianDigits);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nationalId).toBe("0499370899");
    }
  });

  it("rejects invalid English name containing non-latin characters", () => {
    const invalid = {
      ...validPassenger,
      firstNameEn: "علی",
    };
    const result = createPassengerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid national ID", () => {
    const invalid = {
      ...validPassenger,
      nationalId: "123456",
    };
    const result = createPassengerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("updatePassengerSchema", () => {
  it("allows partial updates", () => {
    const partial = {
      firstNameFa: "رضا",
    };
    const result = updatePassengerSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });
});
