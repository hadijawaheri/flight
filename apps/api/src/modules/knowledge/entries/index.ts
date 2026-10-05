import type { KnowledgeEntry } from "../types.js";
import { BAGGAGE_ENTRIES, DANGEROUS_GOODS_ENTRIES } from "./baggage.js";
import {
  CHECKIN_ENTRIES,
  CHILDREN_ENTRIES,
  HEALTH_ENTRIES,
  PET_ENTRIES,
  PLATFORM_ENTRIES,
  SEAT_ENTRIES,
} from "./checkin-people-platform.js";
import { DOCUMENT_ENTRIES, INTERNATIONAL_ENTRIES } from "./documents-intl.js";
import { REFUND_ENTRIES, RIGHTS_ENTRIES } from "./refunds-rights.js";

export const KNOWLEDGE_ENTRIES: readonly KnowledgeEntry[] = [
  ...BAGGAGE_ENTRIES,
  ...DANGEROUS_GOODS_ENTRIES,
  ...DOCUMENT_ENTRIES,
  ...INTERNATIONAL_ENTRIES,
  ...REFUND_ENTRIES,
  ...RIGHTS_ENTRIES,
  ...CHECKIN_ENTRIES,
  ...CHILDREN_ENTRIES,
  ...HEALTH_ENTRIES,
  ...SEAT_ENTRIES,
  ...PET_ENTRIES,
  ...PLATFORM_ENTRIES,
];
