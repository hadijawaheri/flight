// `*` matches one hostname label (letters, digits, hyphen), so a preview pattern such as
// https://flysmart-*-myteam.vercel.app cannot reach into other subdomains or other accounts.
const WILDCARD = "[a-z0-9-]+";

// Scheme + host with `*` allowed only inside the host. A bare `*` or a wildcard directly under a
// shared suffix would let any Vercel user's deployment call the API with cookies.
export function isSafeOriginPattern(pattern: string): boolean {
  if (!pattern.includes("*")) return true;
  const match = /^https?:\/\/([^/*]*\*[^/]*)$/.exec(pattern);
  const host = match?.[1];
  if (!host) return false;
  const labels = host.split(".");
  // The wildcard must not sit in the registrable part: require a fixed label before the suffix
  const wildcardAt = labels.findIndex((label) => label.includes("*"));
  return labels.length >= 3 && wildcardAt < labels.length - 2 && labels[wildcardAt] !== "*";
}

function toRegExp(pattern: string): RegExp {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(WILDCARD);
  return new RegExp(`^${source}$`, "i");
}

export function createOriginMatcher(patterns: readonly string[]): (origin: string) => boolean {
  const exact = new Set(patterns.filter((p) => !p.includes("*")).map((p) => p.toLowerCase()));
  const wild = patterns.filter((p) => p.includes("*")).map(toRegExp);
  return (origin) => exact.has(origin.toLowerCase()) || wild.some((re) => re.test(origin));
}
