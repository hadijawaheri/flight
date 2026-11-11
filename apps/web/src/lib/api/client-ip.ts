// Names shared with the API's common/http/client-ip.ts
const CLIENT_IP_HEADER = "x-client-ip";
const PROXY_SECRET_HEADER = "x-api-proxy-secret";

/**
 * The visitor's address as our own edge saw it. Vercel, and Caddy on a self-hosted server, both
 * replace X-Forwarded-For with the connecting address, so its first entry cannot be forged.
 */
export function visitorIp(incoming: Headers): string | undefined {
  const first = incoming.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || incoming.get("x-real-ip")?.trim() || undefined;
}

/**
 * Headers that let the API rate-limit per visitor instead of per Vercel address. Sent only with
 * the shared secret, which the API checks before it believes the address.
 */
export function clientIpHeaders(
  incoming: Headers,
  secret: string | undefined = process.env.API_PROXY_SECRET,
): Record<string, string> {
  const ip = visitorIp(incoming);
  return secret && ip ? { [CLIENT_IP_HEADER]: ip, [PROXY_SECRET_HEADER]: secret } : {};
}

/** Copy of the request headers for the /api rewrite, with any client-sent copies of ours replaced. */
export function withClientIp(incoming: Headers, secret?: string): Headers {
  const headers = new Headers(incoming);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);
  for (const [name, value] of Object.entries(clientIpHeaders(incoming, secret))) {
    headers.set(name, value);
  }
  return headers;
}
