// Shared by next.config.ts, proxy.ts and the server env: where Next forwards /api/* and where
// server-side fetches go. No `server-only` marker so the config file can import it too.
const LOCAL_API = "http://localhost:7781";

export function resolveApiOrigin(source: Record<string, string | undefined> = process.env): string {
  const url = source.INTERNAL_API_URL?.trim() || source.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  // A Vercel build with the localhost fallback would deploy a site whose every API call fails
  if (source.VERCEL) {
    throw new Error("Set NEXT_PUBLIC_API_URL to the public HTTPS origin of the API (VPS).");
  }
  return LOCAL_API;
}
