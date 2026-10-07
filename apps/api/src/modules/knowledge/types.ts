import type { Reliability, RuleCategory } from "@flysmart/contracts";

/** One verifiable statement-set about flying. The assistant may only assert what is written here. */
export interface KnowledgeEntry {
  id: string;
  category: RuleCategory;
  title: string;
  /** The direct answer in one or two sentences. */
  summary: string;
  details: string[];
  checklist: string[];
  reliability: Reliability;
  /** Where a traveller confirms the current value; required unless reliability is STANDARD. */
  verifyWith: string | null;
  /** Search terms: synonyms, spellings and English names people actually type. */
  keywords: string[];
  /** ISO date of the last human review. */
  reviewedAt: string;
}

/** Entries are authored from general aviation knowledge and still need review by a domain expert. */
export const AUTHORED_ON = "2026-10-07";
