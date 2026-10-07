import { z } from "zod";

export const RULE_CATEGORIES = [
  "BAGGAGE",
  "DANGEROUS_GOODS",
  "DOCUMENTS",
  "INTERNATIONAL",
  "REFUNDS",
  "DELAYS_RIGHTS",
  "CHECK_IN",
  "CHILDREN",
  "HEALTH",
  "SEATS",
  "PETS",
  "PLATFORM",
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  BAGGAGE: "بار و چمدان",
  DANGEROUS_GOODS: "اقلام خطرناک و ممنوعه",
  DOCUMENTS: "مدارک سفر",
  INTERNATIONAL: "سفر خارجی",
  REFUNDS: "استرداد و تغییر بلیت",
  DELAYS_RIGHTS: "تأخیر، لغو و حقوق مسافر",
  CHECK_IN: "پذیرش و سوار شدن",
  CHILDREN: "کودک و نوزاد",
  HEALTH: "سلامت و نیازهای ویژه",
  SEATS: "صندلی",
  PETS: "حیوان خانگی",
  PLATFORM: "خرید در پرواز پلاس",
};

/**
 * How far an answer can be trusted without checking the airline:
 * STANDARD = ICAO/IATA or national rule that is the same for everyone;
 * AIRLINE_SPECIFIC = each airline and fare class sets its own numbers;
 * VOLATILE = amounts or regulations that change often; always confirm the current value.
 */
export const RELIABILITY_LEVELS = ["STANDARD", "AIRLINE_SPECIFIC", "VOLATILE"] as const;
export type Reliability = (typeof RELIABILITY_LEVELS)[number];

export const RELIABILITY_LABELS: Record<Reliability, string> = {
  STANDARD: "قاعده‌ی عمومی",
  AIRLINE_SPECIFIC: "بسته به ایرلاین و نرخ",
  VOLATILE: "ممکن است تغییر کند",
};

export const listRulesQuerySchema = z.object({
  category: z.enum(RULE_CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
});
export type ListRulesQuery = z.infer<typeof listRulesQuerySchema>;

export interface RuleEntryDto {
  id: string;
  category: RuleCategory;
  title: string;
  /** One or two sentences: the direct answer. */
  summary: string;
  /** Detail paragraphs. */
  details: string[];
  /** Concrete checklist items. */
  checklist: string[];
  reliability: Reliability;
  /** Where a traveller should confirm the current value. */
  verifyWith: string | null;
  /** ISO date the entry was last reviewed. */
  reviewedAt: string;
}

export interface RuleCategoryDto {
  category: RuleCategory;
  label: string;
  count: number;
}

export interface RulesIndexDto {
  categories: RuleCategoryDto[];
  entries: RuleEntryDto[];
}

export interface AirportGuideDto {
  code: string;
  nameFa: string;
  nameEn: string;
  cityFa: string;
  countryFa: string;
  /** Flies international routes. */
  international: boolean;
  /** Flies domestic routes (Imam Khomeini does not). */
  domestic: boolean;
  /** Recommended arrival at the airport before departure, minutes. */
  arrivalLeadMinutes: number;
  checkInClosesMinutesBefore: number;
  tips: string[];
  /** Rules that apply to this airport's flights (e.g. international departure formalities). */
  relatedRules: Array<{ id: string; title: string; summary: string; reliability: Reliability }>;
}
