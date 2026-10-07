import { describe, expect, it } from "vitest";

import {
  createPassengerSchema,
  passengerDisplayName,
  passengerIdentityIssues,
  passengerIdentityKey,
  updatePassengerSchema,
} from "./passengers.schema";

const passenger = {
  firstNameFa: "علی",
  lastNameFa: "محمدی",
  firstNameEn: "Ali",
  lastNameEn: "Mohammadi",
  nationalId: "0499370899",
  birthDate: "1990-05-15",
  gender: "MALE",
} as const;

const foreigner = {
  firstNameEn: "John",
  lastNameEn: "Smith",
  nationality: "DE",
  birthDate: "1985-03-02",
  gender: "MALE",
  passportNumber: "c01x00t8r",
  passportExpiry: "2031-01-01",
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

  it("treats a missing nationality as Iranian and still requires the national code", () => {
    expect(createPassengerSchema.parse(passenger).nationality).toBe("IR");
    const parsed = createPassengerSchema.safeParse({ ...passenger, nationalId: undefined });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain("nationalId");
    }
  });

  it("requires Persian names for Iranians only", () => {
    expect(createPassengerSchema.safeParse({ ...passenger, firstNameFa: "" }).success).toBe(false);
    expect(
      createPassengerSchema.safeParse({ ...foreigner, firstNameFa: "", lastNameFa: "" }).success,
    ).toBe(true);
    expect(createPassengerSchema.safeParse(foreigner).success).toBe(true);
  });

  it("accepts a foreigner with a passport and no national code, normalising the number", () => {
    const parsed = createPassengerSchema.parse(foreigner);
    expect(parsed.nationality).toBe("DE");
    expect(parsed.passportNumber).toBe("C01X00T8R");
    expect(parsed.nationalId).toBeUndefined();
    expect(createPassengerSchema.safeParse({ ...foreigner, nationalId: null }).success).toBe(true);
  });

  it("requires the passport number and expiry from a foreigner", () => {
    const parsed = createPassengerSchema.safeParse({
      ...foreigner,
      passportNumber: undefined,
      passportExpiry: undefined,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["passportNumber", "passportExpiry"]),
      );
    }
  });

  it("rejects a nationality outside the supported list", () => {
    expect(createPassengerSchema.safeParse({ ...foreigner, nationality: "ZZ" }).success).toBe(
      false,
    );
    expect(createPassengerSchema.safeParse({ ...foreigner, nationality: "" }).success).toBe(false);
  });
});

describe("updatePassengerSchema", () => {
  it("keeps nationality untouched on partial updates", () => {
    const parsed = updatePassengerSchema.parse({ firstNameFa: "رضا" });
    expect("nationality" in parsed).toBe(false);
  });

  it("still rejects a malformed national code", () => {
    expect(updatePassengerSchema.safeParse({ nationalId: "12" }).success).toBe(false);
    expect(updatePassengerSchema.safeParse({ nationalId: "0499370899" }).success).toBe(true);
  });
});

describe("passengerIdentityIssues", () => {
  it("reports what is missing for each nationality", () => {
    const iranian = passengerIdentityIssues({ nationality: "IR", firstNameFa: "علی" });
    expect(iranian.map((issue) => issue.path)).toEqual(["lastNameFa", "nationalId"]);

    const foreign = passengerIdentityIssues({ nationality: "TR" });
    expect(foreign.map((issue) => issue.path)).toEqual(["passportNumber", "passportExpiry"]);
  });

  it("flags a single-letter Persian name even for foreigners", () => {
    const issues = passengerIdentityIssues({
      nationality: "TR",
      firstNameFa: "ا",
      passportNumber: "A1234567",
      passportExpiry: "2031-01-01",
    });
    expect(issues.map((issue) => issue.path)).toEqual(["firstNameFa"]);
  });
});

describe("passengerIdentityKey", () => {
  it("is the national code for Iranians and country + passport for foreigners", () => {
    expect(passengerIdentityKey({ nationalId: "0499370899" })).toBe("IR:0499370899");
    expect(passengerIdentityKey({ nationality: "DE", passportNumber: "C01X00T8R" })).toBe(
      "DE:C01X00T8R",
    );
    expect(passengerIdentityKey({ nationality: "DE" })).toBeNull();
  });
});

describe("passengerDisplayName", () => {
  it("falls back to the Latin name when there is no Persian one", () => {
    const names = { firstNameFa: "", lastNameFa: "", firstNameEn: "JOHN", lastNameEn: "SMITH" };
    expect(passengerDisplayName(names)).toBe("JOHN SMITH");
    expect(passengerDisplayName({ ...names, firstNameFa: "علی", lastNameFa: "رضایی" })).toBe(
      "علی رضایی",
    );
  });
});
