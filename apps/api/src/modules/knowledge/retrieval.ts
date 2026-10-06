import { normalizeText } from "@flysmart/contracts";

import type { KnowledgeEntry } from "./types.js";

/** Function words that carry no topic; dropping them keeps "چند کیلو بار" from matching everything. */
const STOPWORDS = new Set([
  "و",
  "یا",
  "را",
  "از",
  "به",
  "در",
  "با",
  "که",
  "این",
  "آن",
  "برای",
  "است",
  "هست",
  "باشه",
  "بود",
  "می",
  "من",
  "ما",
  "شما",
  "چه",
  "چی",
  "چطور",
  "چگونه",
  "آیا",
  "هم",
  "تا",
  "اگر",
  "شد",
  "شده",
  "شود",
  "کرد",
  "کنه",
  "یه",
  "یک",
  "کنم",
  "کنیم",
  "میشه",
  "می‌شه",
  "میشود",
  "the",
  "a",
  "an",
  "is",
  "are",
  "to",
  "of",
  "in",
  "for",
  "can",
  "i",
  "my",
  "how",
  "what",
  "do",
  "does",
]);

/** Light plural/ezafe stripping so "چمدان‌ها" and "چمدان" meet; deliberately not a full stemmer. */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("های")) return token.slice(0, -3);
  if (token.length > 3 && token.endsWith("ها")) return token.slice(0, -2);
  // "مدارکی"/"ویزای" (indefinite and ezafe ی) must meet "مدارک"/"ویزا"; applied to both sides so
  // words that naturally end in ی ("خارجی") still match each other
  if (token.length > 4 && token.endsWith("ی")) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
}

interface IndexedEntry {
  entry: KnowledgeEntry;
  title: Set<string>;
  keywordTokens: Set<string>;
  keywordPhrases: string[];
  body: Set<string>;
  bodyBigrams: Set<string>;
}

function bigrams(tokens: readonly string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index + 1 < tokens.length; index += 1)
    result.push(`${tokens[index]} ${tokens[index + 1]}`);
  return result;
}

const WEIGHTS = { keywordPhrase: 8, keywordToken: 4, title: 3, body: 1, bigram: 2 } as const;
export const MIN_SCORE = 3;

export interface RetrievalHit {
  entry: KnowledgeEntry;
  score: number;
}

export class KnowledgeIndex {
  private readonly items: IndexedEntry[];
  /** Rarer words say more about the topic: "سگ" points at one entry, "مجاز" at half of them. */
  private readonly idf = new Map<string, number>();

  constructor(entries: readonly KnowledgeEntry[]) {
    this.items = entries.map((entry) => {
      const bodyTokens = tokenize([entry.summary, ...entry.details, ...entry.checklist].join(" "));
      return {
        entry,
        title: new Set(tokenize(entry.title)),
        keywordTokens: new Set(entry.keywords.flatMap(tokenize)),
        keywordPhrases: entry.keywords
          .map((keyword) => tokenize(keyword).join(" "))
          .filter((phrase) => phrase.includes(" ")),
        body: new Set(bodyTokens),
        bodyBigrams: new Set(bigrams(bodyTokens)),
      };
    });

    const documentFrequency = new Map<string, number>();
    for (const item of this.items) {
      for (const token of new Set([...item.title, ...item.keywordTokens, ...item.body])) {
        documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
      }
    }
    const total = this.items.length;
    for (const [token, count] of documentFrequency) {
      this.idf.set(token, Math.log(1 + total / count) / Math.log(1 + total));
    }
  }

  get(id: string): KnowledgeEntry | undefined {
    return this.items.find((item) => item.entry.id === id)?.entry;
  }

  all(): KnowledgeEntry[] {
    return this.items.map((item) => item.entry);
  }

  search(query: string, limit = 3): RetrievalHit[] {
    const tokens = [...new Set(tokenize(query))];
    if (tokens.length === 0) return [];
    const joined = tokens.join(" ");
    const queryBigrams = bigrams(tokens);

    const hits: RetrievalHit[] = [];
    for (const item of this.items) {
      let score = 0;
      for (const phrase of item.keywordPhrases)
        if (joined.includes(phrase)) score += WEIGHTS.keywordPhrase;
      for (const token of tokens) {
        const rarity = this.idf.get(token) ?? 0;
        if (item.keywordTokens.has(token)) score += WEIGHTS.keywordToken * rarity;
        if (item.title.has(token)) score += WEIGHTS.title * rarity;
        if (item.body.has(token)) score += WEIGHTS.body * rarity;
      }
      for (const pair of queryBigrams) if (item.bodyBigrams.has(pair)) score += WEIGHTS.bigram;
      if (score >= MIN_SCORE) hits.push({ entry: item.entry, score });
    }
    return hits
      .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
      .slice(0, limit);
  }
}
