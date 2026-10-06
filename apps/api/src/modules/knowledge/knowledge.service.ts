import type {
  AirportGuideDto,
  ListRulesQuery,
  RuleCategory,
  RuleEntryDto,
  RulesIndexDto,
} from "@flysmart/contracts";
import { getAirport, RULE_CATEGORIES, RULE_CATEGORY_LABELS } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { AppException } from "../../common/app-exception.js";
import { KNOWLEDGE_ENTRIES } from "./entries/index.js";
import { KnowledgeIndex, type RetrievalHit } from "./retrieval.js";
import type { KnowledgeEntry } from "./types.js";

/** Typical lead times: airports publish their own, these are the common minimums. */
const ARRIVAL_LEAD = { domestic: 120, international: 180 } as const;
const CHECK_IN_CLOSES = { domestic: 45, international: 60 } as const;

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

    const kind = airport.international ? "international" : "domestic";
    const related = airport.international
      ? ["checkin-times", "intl-exit-formalities", "docs-international", "dg-liquids"]
      : ["checkin-times", "baggage-checked-allowance", "docs-domestic", "dg-lithium-batteries"];

    const tips = [
      `پیش از پرواز حدود ${ARRIVAL_LEAD[kind] / 60} ساعت زودتر به فرودگاه برسید؛ در ایام شلوغ زودتر.`,
      `پذیرش معمولاً ${CHECK_IN_CLOSES[kind]} دقیقه پیش از پرواز بسته می‌شود.`,
      "ساعت و گیت پرواز را همان روز در تابلوی اعلان یا از ایرلاین بررسی کنید.",
      ...(airport.international
        ? ["برای پرواز خارجی، گذرنامه‌ی معتبر و ویزای مقصد را همراه داشته باشید."]
        : []),
    ];

    return {
      code: airport.code,
      nameFa: airport.nameFa,
      nameEn: airport.nameEn,
      cityFa: airport.cityFa,
      countryFa: airport.countryFa,
      international: airport.international,
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
