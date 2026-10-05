import { describe, expect, it } from "vitest";

import { buildCheckoutSchema, slotTypesFor, TYPE_MISMATCH_MESSAGES } from "./checkout-schema";

const adult = {
  firstNameFa: "علی",
  lastNameFa: "رضایی",
  firstNameEn: "Ali",
  lastNameEn: "Rezaei",
  nationalId: "0013542419",
  birthDate: "1990-05-10",
  gender: "MALE" as const,
};

function form(passengers: unknown[], seatPreference = "ANY") {
  return { passengers, contact: { mobile: "09123456789" }, seatPreference };
}

describe("checkout schema", () => {
  const domestic = buildCheckoutSchema({
    slotTypes: ["ADULT"],
    flightDates: ["2026-10-20"],
    international: false,
  });

  it("builds slot types adults → children → infants", () => {
    expect(slotTypesFor({ adults: 2, children: 1, infants: 1 })).toEqual([
      "ADULT",
      "ADULT",
      "CHILD",
      "INFANT",
    ]);
  });

  it("accepts a valid domestic adult and normalizes names", () => {
    const parsed = domestic.safeParse(form([adult]));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.passengers[0]?.firstNameEn).toBe("ALI");
  });

  it("rejects a child-aged person in an adult slot", () => {
    const parsed = domestic.safeParse(form([{ ...adult, birthDate: "2020-01-01" }]));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(
        (item) => item.path.join(".") === "passengers.0.birthDate",
      );
      expect(issue?.message).toBe(TYPE_MISMATCH_MESSAGES.ADULT);
    }
  });

  it("requires a passport valid six months past the last flight on international trips", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT"],
      flightDates: ["2026-10-20", "2026-10-27"],
      international: true,
    });
    const missing = schema.safeParse(form([adult]));
    expect(missing.success).toBe(false);

    const expiring = schema.safeParse(
      form([{ ...adult, passportNumber: "A1234567", passportExpiry: "2027-02-01" }]),
    );
    expect(expiring.success).toBe(false);

    const fine = schema.safeParse(
      form([{ ...adult, passportNumber: "A1234567", passportExpiry: "2030-01-01" }]),
    );
    expect(fine.success).toBe(true);
  });

  it("flags duplicate national ids", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT", "ADULT"],
      flightDates: ["2026-10-20"],
      international: false,
    });
    const parsed = schema.safeParse(form([adult, { ...adult, firstNameFa: "رضا" }]));
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(
        parsed.error.issues.some((item) => item.path.join(".") === "passengers.1.nationalId"),
      ).toBe(true);
  });
});
