import type {
  AirportGuideDto,
  ListRulesQuery,
  RuleCategory,
  RuleEntryDto,
  RulesIndexDto,
} from "@flysmart/contracts";
import {
  airportServes,
  getAirport,
  RULE_CATEGORIES,
  RULE_CATEGORY_LABELS,
} from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { AppException } from "../../common/app-exception.js";
import { KNOWLEDGE_ENTRIES } from "./entries/index.js";
import { KnowledgeIndex, type RetrievalHit } from "./retrieval.js";
import type { KnowledgeEntry } from "./types.js";

/**
 * Common industry practice (2 h / 3 h arrival, check-in closing 45 / 60 min), not an official
 * Iranian rule: every airline and airport sets its own, so all text built from these says "typical".
 */
const ARRIVAL_LEAD = { domestic: 120, international: 180 } as const;
const CHECK_IN_CLOSES = { domestic: 45, international: 60 } as const;

const faNumber = new Intl.NumberFormat("fa-IR");
const leadHours = (kind: keyof typeof ARRIVAL_LEAD): string =>
  faNumber.format(ARRIVAL_LEAD[kind] / 60);
const closeMinutes = (kind: keyof typeof CHECK_IN_CLOSES): string =>
  faNumber.format(CHECK_IN_CLOSES[kind]);

export function toRuleDto(entry: KnowledgeEntry): RuleEntryDto {
  return {
    id: entry.id,
    category: entry.category,
    title: entry.title,
    summary: entry.summary,
    details: entry.details,
    checklist: entry.checklist,
    reliability: entry.reliability,
    verifyWith: entry.verifyWith,
    reviewedAt: entry.reviewedAt,
  };
}

@Injectable()
export class KnowledgeService {
  private readonly index = new KnowledgeIndex(KNOWLEDGE_ENTRIES);

  list(query: ListRulesQuery): RulesIndexDto {
    const matched = query.q
      ? this.index.search(query.q, 20).map((hit) => hit.entry)
      : this.index.all();
    const entries = matched.filter((entry) => !query.category || entry.category === query.category);

    const counts = new Map<RuleCategory, number>();
    for (const entry of matched) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);

    return {
      categories: RULE_CATEGORIES.map((category) => ({
        category,
        label: RULE_CATEGORY_LABELS[category],
        count: counts.get(category) ?? 0,
      })),
      entries: entries.map(toRuleDto),
    };
  }

  get(id: string): RuleEntryDto {
    const entry = this.index.get(id);
    if (!entry) throw new AppException(404, "NOT_FOUND", "این قانون یافت نشد");
    return toRuleDto(entry);
  }

  entry(id: string): KnowledgeEntry | undefined {
    return this.index.get(id);
  }

  search(query: string, limit = 3): RetrievalHit[] {
    return this.index.search(query, limit);
  }

  airportGuide(code: string): AirportGuideDto {
    const airport = getAirport(code);
    if (!airport) throw new AppException(404, "NOT_FOUND", "فرودگاه یافت نشد");

    // What the airport actually flies decides the advice: Imam Khomeini has no domestic flights and
    // most small airports have no international ones, so tips never describe a service it lacks.
    const domestic = airportServes(airport.code, "DOMESTIC");
    const international = airportServes(airport.code, "INTERNATIONAL");
    const kind = international ? "international" : "domestic";
    const related = international
      ? ["checkin-times", "intl-exit-formalities", "docs-international", "dg-liquids"]
      : ["checkin-times", "baggage-checked-allowance", "docs-domestic", "dg-lithium-batteries"];

    const arrival = (label: string, which: keyof typeof ARRIVAL_LEAD) =>
      `برای پرواز ${label} حدود ${leadHours(which)} ساعت زودتر به فرودگاه برسید`;
    const closing = (label: string, which: keyof typeof CHECK_IN_CLOSES) =>
      `${closeMinutes(which)} دقیقه (${label})`;
    const tips = [
      international && domestic
        ? `${arrival("خارجی", "international")} و ${arrival("داخلی", "domestic")}؛ در ایام شلوغ زودتر.`
        : `${arrival(international ? "خارجی" : "داخلی", kind)}؛ در ایام شلوغ زودتر.`,
      international && domestic
        ? `پذیرش بسیاری از ایرلاین‌ها حدود ${closing("خارجی", "international")} و ${closing("داخلی", "domestic")} پیش از پرواز بسته می‌شود؛ بعضی زودتر می‌بندند و زمان دقیق را ایرلاین اعلام می‌کند.`
        : `پذیرش بسیاری از ایرلاین‌ها حدود ${closeMinutes(kind)} دقیقه پیش از پرواز بسته می‌شود؛ بعضی زودتر می‌بندند و زمان دقیق را ایرلاین اعلام می‌کند.`,
      "ساعت و گیت پرواز را همان روز در تابلوی اعلان یا از ایرلاین بررسی کنید.",
      ...(international
        ? ["برای پرواز خارجی، گذرنامه‌ی معتبر و در صورت نیاز ویزای مقصد را همراه داشته باشید."]
        : []),
      ...(!domestic && airport.countryCode === "IR"
        ? [
            "این فرودگاه در این سرویس فقط پرواز خارجی دارد؛ برای سفر داخلی از مهرآباد یا فرودگاه شهر دیگر جست‌وجو کنید.",
          ]
        : []),
    ];

    return {
      code: airport.code,
      nameFa: airport.nameFa,
      nameEn: airport.nameEn,
      cityFa: airport.cityFa,
      countryFa: airport.countryFa,
      international,
      domestic,
      arrivalLeadMinutes: ARRIVAL_LEAD[kind],
      checkInClosesMinutesBefore: CHECK_IN_CLOSES[kind],
      tips,
      relatedRules: related.flatMap((id) => {
        const entry = this.index.get(id);
        return entry
          ? [
              {
                id: entry.id,
                title: entry.title,
                summary: entry.summary,
                reliability: entry.reliability,
              },
            ]
          : [];
      }),
    };
  }
}
