import { describe, expect, it } from "vitest";

import { assessPassport, maskPassportNumber } from "./passport";

const intl = { international: true, travelDates: ["2026-10-20", "2026-10-27"] };
const domestic = { international: false, travelDates: ["2026-10-20"] };
const document = { passportNumber: "A1234567" };

describe("assessPassport", () => {
  it("asks nothing of an Iranian on a domestic flight", () => {
    expect(assessPassport({}, domestic)).toBe("NOT_REQUIRED");
    expect(assessPassport({ nationality: "IR" }, domestic)).toBe("NOT_REQUIRED");
  });

  it("requires a passport from foreigners even on domestic flights", () => {
    expect(assessPassport({ nationality: "TR" }, domestic)).toBe("MISSING");
    expect(
      assessPassport({ nationality: "TR", ...document, passportExpiry: "2030-01-01" }, domestic),
    ).toBe("OK");
  });

  it("reports a missing number or expiry on international flights", () => {
    expect(assessPassport({}, intl)).toBe("MISSING");
    expect(assessPassport({ ...document }, intl)).toBe("MISSING");
    expect(assessPassport({ passportExpiry: "2030-01-01" }, intl)).toBe("MISSING");
  });

  it("blocks a passport that has expired by the last flight", () => {
    expect(assessPassport({ ...document, passportExpiry: "2026-10-26" }, intl)).toBe("EXPIRED");
    expect(assessPassport({ ...document, passportExpiry: "2026-01-01" }, domestic)).toBe(
      "NOT_REQUIRED",
    );
    expect(
      assessPassport({ nationality: "DE", ...document, passportExpiry: "2026-01-01" }, domestic),
    ).toBe("EXPIRED");
  });

  it("only warns when valid on the day but short of six months", () => {
    expect(assessPassport({ ...document, passportExpiry: "2026-10-27" }, intl)).toBe(
      "SHORT_VALIDITY",
    );
    expect(assessPassport({ ...document, passportExpiry: "2027-02-01" }, intl)).toBe(
      "SHORT_VALIDITY",
    );
    // 2026-10-27 + 183 days = 2027-04-28
    expect(assessPassport({ ...document, passportExpiry: "2027-04-27" }, intl)).toBe(
      "SHORT_VALIDITY",
    );
    expect(assessPassport({ ...document, passportExpiry: "2027-04-28" }, intl)).toBe("OK");
  });

  it("measures validity from the latest date whatever the order", () => {
    expect(
      assessPassport(
        { ...document, passportExpiry: "2027-02-01" },
        { international: true, travelDates: ["2026-10-27", "2026-10-20"] },
      ),
    ).toBe("SHORT_VALIDITY");
  });
});

describe("maskPassportNumber", () => {
  it("keeps the last three characters and tolerates short or missing numbers", () => {
    expect(maskPassportNumber("A1234567")).toBe("*****567");
    expect(maskPassportNumber("AB1")).toBe("***");
    expect(maskPassportNumber(null)).toBeNull();
  });
});
