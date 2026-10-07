import { describe, expect, it } from "vitest";

import { ESCORT_MESSAGES, MIN_ESCORT_AGE, validateEscort } from "./escort";

const DATE = "2026-10-20";
const adult = { birthDate: "1990-05-10" };
const teen = { birthDate: "2010-01-01" }; // 16 on the travel date: an adult fare, not a legal escort
const child = { birthDate: "2018-03-03" };
const infant = { birthDate: "2025-08-01" };

describe("validateEscort", () => {
  it("uses 18 as the escort age", () => {
    expect(MIN_ESCORT_AGE).toBe(18);
  });

  it("accepts adults alone and an adult with a child or infant", () => {
    expect(validateEscort([adult], [DATE])).toBeNull();
    expect(validateEscort([adult, child], [DATE])).toBeNull();
    expect(validateEscort([adult, infant], [DATE])).toBeNull();
    expect(validateEscort([adult, teen, child, infant], [DATE])).toBeNull();
  });

  it("accepts a teenager travelling without anyone small", () => {
    expect(validateEscort([teen], [DATE])).toBeNull();
    expect(validateEscort([teen, teen], [DATE])).toBeNull();
  });

  it("rejects a child or infant whose only companion is under 18", () => {
    expect(validateEscort([teen, child], [DATE])).toBe(ESCORT_MESSAGES.noEscort);
    expect(validateEscort([teen, infant], [DATE])).toBe(ESCORT_MESSAGES.noEscort);
    expect(validateEscort([child], [DATE])).toBe(ESCORT_MESSAGES.noEscort);
  });

  it("is exact on the 18th birthday", () => {
    expect(validateEscort([{ birthDate: "2008-10-20" }, child], [DATE])).toBeNull();
    expect(validateEscort([{ birthDate: "2008-10-21" }, child], [DATE])).toBe(
      ESCORT_MESSAGES.noEscort,
    );
  });

  it("rejects more infants than escorts", () => {
    expect(validateEscort([adult, infant, infant], [DATE])).toBe(ESCORT_MESSAGES.tooManyInfants);
    expect(validateEscort([adult, teen, infant, infant], [DATE])).toBe(
      ESCORT_MESSAGES.tooManyInfants,
    );
    expect(validateEscort([adult, adult, infant, infant], [DATE])).toBeNull();
  });

  it("checks every leg of a round trip", () => {
    // Turns 18 between the legs: fine on the way back, but not on the way out
    const almost = { birthDate: "2008-11-15" };
    expect(validateEscort([almost, child], ["2026-10-20", "2026-12-01"])).toBe(
      ESCORT_MESSAGES.noEscort,
    );
    expect(validateEscort([almost, child], ["2026-12-01"])).toBeNull();
    // An infant who turns 2 mid-trip is a child on the return, which needs an escort all the same
    const turnsTwo = { birthDate: "2024-11-15" };
    expect(validateEscort([adult, turnsTwo], ["2026-10-20", "2026-12-01"])).toBeNull();
  });

  it("has nothing to check without travel dates", () => {
    expect(validateEscort([teen, child], [])).toBeNull();
  });
});
