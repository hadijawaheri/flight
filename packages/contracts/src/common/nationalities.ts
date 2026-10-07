/** Home market: its travellers identify themselves with an Iranian national code. */
export const DEFAULT_NATIONALITY = "IR";

/**
 * ISO 3166-1 alpha-2 codes of the nationalities the passenger form offers. Deliberately short: a
 * country missing here is a one-line addition, while an open text field would let typos through
 * into documents the airline reads.
 */
export const NATIONALITY_NAMES_FA = {
  IR: "ایران",
  AF: "افغانستان",
  IQ: "عراق",
  PK: "پاکستان",
  IN: "هند",
  TR: "ترکیه",
  AZ: "جمهوری آذربایجان",
  AM: "ارمنستان",
  GE: "گرجستان",
  TM: "ترکمنستان",
  TJ: "تاجیکستان",
  UZ: "ازبکستان",
  KZ: "قزاقستان",
  RU: "روسیه",
  CN: "چین",
  JP: "ژاپن",
  KR: "کره‌ی جنوبی",
  TH: "تایلند",
  MY: "مالزی",
  AE: "امارات متحده‌ی عربی",
  QA: "قطر",
  KW: "کویت",
  OM: "عمان",
  BH: "بحرین",
  SA: "عربستان سعودی",
  LB: "لبنان",
  SY: "سوریه",
  DE: "آلمان",
  FR: "فرانسه",
  GB: "بریتانیا",
  IT: "ایتالیا",
  ES: "اسپانیا",
  NL: "هلند",
  SE: "سوئد",
  CH: "سوئیس",
  AT: "اتریش",
  CA: "کانادا",
  US: "ایالات متحده",
  AU: "استرالیا",
  BR: "برزیل",
} as const;

export type NationalityCode = keyof typeof NATIONALITY_NAMES_FA;

// Object.keys loses the key type; the cast restores the tuple shape z.enum needs
export const NATIONALITY_CODES = Object.keys(NATIONALITY_NAMES_FA) as [
  NationalityCode,
  ...NationalityCode[],
];

/** Everything but Iran, in the order the select shows them. */
export const FOREIGN_NATIONALITY_CODES: readonly NationalityCode[] = NATIONALITY_CODES.filter(
  (code) => code !== DEFAULT_NATIONALITY,
);

export function isIranian(nationality: string | null | undefined): boolean {
  return (nationality ?? DEFAULT_NATIONALITY) === DEFAULT_NATIONALITY;
}

/** The raw code is returned for a value outside the list, e.g. one stored by a newer release. */
export function nationalityNameFa(code: string): string {
  return (NATIONALITY_NAMES_FA as Record<string, string>)[code] ?? code;
}
