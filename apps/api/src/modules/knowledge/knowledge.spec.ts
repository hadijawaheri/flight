import { RULE_CATEGORIES } from "@flysmart/contracts";
import { describe, expect, it } from "vitest";

import { AppException } from "../../common/app-exception.js";
import { KNOWLEDGE_ENTRIES } from "./entries/index.js";
import { KnowledgeService } from "./knowledge.service.js";
import { tokenize } from "./retrieval.js";

const service = new KnowledgeService();

describe("knowledge base integrity", () => {
  it("has unique ids", () => {
    const ids = KNOWLEDGE_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every rule category", () => {
    const covered = new Set(KNOWLEDGE_ENTRIES.map((entry) => entry.category));
    for (const category of RULE_CATEGORIES) expect(covered.has(category), category).toBe(true);
  });

  it("requires a verification source unless the rule is standard", () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      if (entry.reliability !== "STANDARD") expect(entry.verifyWith, entry.id).toBeTruthy();
    }
  });

  it("has a summary, details, checklist and keywords on every entry", () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      expect(entry.summary.length, entry.id).toBeGreaterThan(30);
      expect(entry.details.length, entry.id).toBeGreaterThan(0);
      expect(entry.checklist.length, entry.id).toBeGreaterThan(0);
      expect(entry.keywords.length, entry.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("marks money, regulation and visa topics as volatile", () => {
    for (const id of ["intl-exit-formalities", "intl-currency-customs", "docs-international"]) {
      expect(service.entry(id)?.reliability, id).toBe("VOLATILE");
    }
  });
});

describe("tokenize", () => {
  it("drops stopwords and unifies Arabic letters and plurals", () => {
    expect(tokenize("چمدان‌ها و كيف")).toEqual(["چمدان", "کیف"]);
  });

  it("strips the indefinite and ezafe ی so مدارکی meets مدارک", () => {
    expect(tokenize("مدارکی ویزای")).toEqual(["مدارک", "ویزا"]);
  });
});

describe("retrieval", () => {
  const top = (query: string): string | undefined => service.search(query, 1)[0]?.entry.id;

  it.each([
    ["پاوربانک در هواپیما مجاز است؟", "dg-lithium-batteries"],
    ["چند کیلو بار مجاز دارم", "baggage-checked-allowance"],
    ["اضافه بار چقدر هزینه دارد", "baggage-excess"],
    ["مدارک لازم برای پرواز خارجی", "docs-international"],
    ["چند ساعت قبل فرودگاه باشم", "checkin-times"],
    ["جریمه کنسلی بلیت", "refund-voluntary"],
    ["پرواز من کنسل شد", "refund-involuntary"],
    ["بارداری و پرواز", "health-pregnancy"],
    ["ویلچر در فرودگاه", "health-wheelchair"],
    ["مهلت پرداخت رزرو", "platform-booking-hold"],
    ["تحلیل قیمت چطور کار میکنه", "platform-price-analysis"],
    ["سفر با سگ", "pets-travel"],
    // Found by browsing the live site: these used to land on the domestic-documents entry
    ["برای سفر به استانبول چه مدارکی لازم است؟", "docs-international"],
    ["برای سفر خارجی چه مدارکی لازم دارم", "docs-international"],
    ["ویزای ترکیه لازم است؟", "docs-international"],
    ["گذرنامه‌ام ۴ ماه اعتبار دارد می‌توانم به دبی بروم", "docs-international"],
    ["با بچه ۳ ساله به مشهد چه مدارکی؟", "docs-minors"],
  ])("answers %s from %s", (query, expected) => {
    expect(top(query)).toBe(expected);
  });

  it("returns nothing for unrelated questions", () => {
    expect(service.search("بهترین رستوران شیراز کجاست", 3)).toEqual([]);
    expect(service.search("", 3)).toEqual([]);
  });

  it("understands Persian digits and Arabic keyboard letters", () => {
    expect(top("پاوربانک ۲۰۰۰۰ ميلي آمپر")).toBe("dg-lithium-batteries");
  });
});

describe("rules listing", () => {
  it("filters by category and counts every category", () => {
    const result = service.list({ category: "REFUNDS" });
    expect(result.entries.every((entry) => entry.category === "REFUNDS")).toBe(true);
    expect(result.categories).toHaveLength(RULE_CATEGORIES.length);
  });

  it("filters by free text", () => {
    const result = service.list({ q: "لیتیوم باتری" });
    expect(result.entries[0]?.id).toBe("dg-lithium-batteries");
  });

  it("throws a not-found error for unknown ids", () => {
    expect(() => service.get("nope")).toThrow(AppException);
  });
});

describe("airport guide", () => {
  it("gives international airports a longer lead time and exit formalities", () => {
    const ika = service.airportGuide("IKA");
    const ker = service.airportGuide("KER");
    expect(ika.arrivalLeadMinutes).toBeGreaterThan(ker.arrivalLeadMinutes);
    expect(ika.relatedRules.some((rule) => rule.id === "intl-exit-formalities")).toBe(true);
    expect(ker.relatedRules.some((rule) => rule.id === "intl-exit-formalities")).toBe(false);
  });

  it("rejects unknown airports", () => {
    expect(() => service.airportGuide("XXX")).toThrow(AppException);
  });
});
