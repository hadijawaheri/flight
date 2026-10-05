/** Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits. */
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Normalizes text typed on Arabic keyboards for matching: Arabic yeh/kaf become Persian,
 * ZWNJ and tatweel are dropped, case is folded and whitespace collapsed.
 */
export function normalizeText(input: string): string {
  return normalizeDigits(input)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/[‌‏‎ـ]/g, "")
    .replace(/[ً-ٟ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
