import { ESCORT_MESSAGES, PASSPORT_MESSAGES } from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import {
  buildCheckoutSchema,
  shortPassportSlots,
  slotTypesFor,
  TYPE_MISMATCH_MESSAGES,
} from "./checkout-schema";

const adult = {
  firstNameFa: "علی",
  lastNameFa: "رضایی",
  firstNameEn: "Ali",
  lastNameEn: "Rezaei",
  nationalId: "0013542419",
  birthDate: "1990-05-10",
  gender: "MALE" as const,
};

const adultTwo = { ...adult, firstNameFa: "رضا", nationalId: "0499370899" };
// 16 on 2026-10-20: priced as an adult, but not a legal escort
const teen = { ...adult, firstNameFa: "سارا", nationalId: "0499370899", birthDate: "2010-01-01" };
const child = { ...adult, firstNameFa: "کیان", nationalId: "0010350829", birthDate: "2018-03-03" };
const infant = { ...adult, firstNameFa: "نیما", nationalId: "0084575948", birthDate: "2025-08-01" };

const foreigner = {
  firstNameEn: "John",
  lastNameEn: "Smith",
  nationality: "DE" as const,
  birthDate: "1985-03-02",
  gender: "MALE" as const,
  passportNumber: "C01X00T8R",
  passportExpiry: "2031-01-01",
};

function form(passengers: unknown[], extra: Record<string, unknown> = {}) {
  return {
    passengers,
    contact: { mobile: "09123456789" },
    seatPreference: "ANY",
    passportValidityAcknowledged: false,
    ...extra,
  };
}

function paths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
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

describe("checkout schema: passport on international trips", () => {
  const schema = buildCheckoutSchema({
    slotTypes: ["ADULT"],
    flightDates: ["2026-10-20", "2026-10-27"],
    international: true,
  });
  const withPassport = (passportExpiry: string) => ({
    ...adult,
    passportNumber: "A1234567",
    passportExpiry,
  });

  it("requires a passport", () => {
    const parsed = schema.safeParse(form([adult]));
    expect(parsed.success).toBe(false);
    expect(paths(parsed)).toEqual(
      expect.arrayContaining(["passengers.0.passportNumber", "passengers.0.passportExpiry"]),
    );
  });

  it("blocks a passport that has expired by the last flight, acknowledged or not", () => {
    for (const acknowledged of [false, true]) {
      const parsed = schema.safeParse(
        form([withPassport("2026-10-26")], { passportValidityAcknowledged: acknowledged }),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issue = parsed.error.issues.find(
          (item) => item.path.join(".") === "passengers.0.passportExpiry",
        );
        expect(issue?.message).toBe(PASSPORT_MESSAGES.expired);
      }
    }
  });

  it("only warns about under six months, and needs the acknowledgement to go on", () => {
    const shortLived = form([withPassport("2027-02-01")]);
    const refused = schema.safeParse(shortLived);
    expect(refused.success).toBe(false);
    expect(paths(refused)).toEqual(["passportValidityAcknowledged"]);

    const accepted = schema.safeParse({ ...shortLived, passportValidityAcknowledged: true });
    expect(accepted.success).toBe(true);
  });

  it("needs no acknowledgement when the passport has six months left", () => {
    expect(schema.safeParse(form([withPassport("2030-01-01")])).success).toBe(true);
  });

  it("lists the slots that trigger the warning", () => {
    const rules = { flightDates: ["2026-10-20"], international: true };
    expect(
      shortPassportSlots(
        [
          { passportNumber: "A1234567", passportExpiry: "2027-01-01" },
          { passportNumber: "A1234567", passportExpiry: "2031-01-01" },
          { passportNumber: "A1234567", passportExpiry: "2026-01-01" },
          undefined,
          {},
        ],
        rules,
      ),
    ).toEqual([0]);
    // Domestic and Iranian: no passport is asked for, so nothing to warn about
    const domesticRules = { ...rules, international: false };
    expect(shortPassportSlots([{ passportExpiry: "2027-01-01" }], domesticRules)).toEqual([]);
  });
});

describe("checkout schema: escort age", () => {
  const dates = ["2026-10-20"];

  it("rejects a 16-year-old as the only companion of a child", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT", "CHILD"],
      flightDates: dates,
      international: false,
    });
    const parsed = schema.safeParse(form([teen, child]));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((item) => item.message === ESCORT_MESSAGES.noEscort);
      expect(issue?.path.join(".")).toBe("passengers.0.birthDate");
    }
  });

  it("accepts the same child when another passenger is 18 or older", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT", "ADULT", "CHILD"],
      flightDates: dates,
      international: false,
    });
    expect(schema.safeParse(form([adult, teen, child])).success).toBe(true);
  });

  it("rejects more infants than passengers aged 18 or older", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT", "ADULT", "INFANT", "INFANT"],
      flightDates: dates,
      international: false,
    });
    const secondInfant = { ...infant, nationalId: "0010350829" };
    const parsed = schema.safeParse(form([adult, teen, infant, secondInfant]));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((item) => item.message);
      expect(messages).toContain(ESCORT_MESSAGES.tooManyInfants);
    }
  });

  it("checks the return leg too", () => {
    const schema = buildCheckoutSchema({
      slotTypes: ["ADULT", "CHILD"],
      flightDates: ["2026-10-20", "2026-10-27"],
      international: false,
    });
    // Turns 18 on 2026-10-25: an escort on the way back only
    const almost = { ...adultTwo, birthDate: "2008-10-25" };
    expect(schema.safeParse(form([almost, child])).success).toBe(false);
  });
});

describe("checkout schema: foreign passengers", () => {
  const twoSlots = buildCheckoutSchema({
    slotTypes: ["ADULT", "ADULT"],
    flightDates: ["2026-10-20"],
    international: false,
  });

  it("takes a foreigner with a passport and no national code or Persian names", () => {
    expect(twoSlots.safeParse(form([adult, foreigner])).success).toBe(true);
  });

  it("requires the passport of a foreigner even on a domestic trip", () => {
    const parsed = twoSlots.safeParse(
      form([adult, { ...foreigner, passportNumber: null, passportExpiry: null }]),
    );
    expect(parsed.success).toBe(false);
    expect(paths(parsed)).toEqual(
      expect.arrayContaining(["passengers.1.passportNumber", "passengers.1.passportExpiry"]),
    );
  });

  it("still requires the national code of an Iranian", () => {
    const parsed = twoSlots.safeParse(form([{ ...adult, nationalId: null }, foreigner]));
    expect(parsed.success).toBe(false);
    expect(paths(parsed)).toContain("passengers.0.nationalId");
  });

  it("flags the same foreign passport twice", () => {
    const parsed = twoSlots.safeParse(form([foreigner, { ...foreigner, firstNameEn: "Jane" }]));
    expect(parsed.success).toBe(false);
    expect(paths(parsed)).toContain("passengers.1.passportNumber");
  });

  it("blocks an expired foreign passport on a domestic trip", () => {
    const parsed = twoSlots.safeParse(
      form([adult, { ...foreigner, passportExpiry: "2026-10-01" }]),
    );
    expect(parsed.success).toBe(false);
    expect(paths(parsed)).toContain("passengers.1.passportExpiry");
  });
});
