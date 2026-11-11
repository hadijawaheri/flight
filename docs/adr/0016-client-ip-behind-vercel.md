# 0016 · Visitor address behind Vercel

Date: 2026-11-10 · Status: accepted

- **Why:** the web app runs on Vercel and the API on its own server. Every request reaches the API from a Vercel address, so the per-IP rate limits (OTP 3 a minute, assistant 12 a minute and the rest) would count all visitors together, and one busy minute would lock everyone out of sign-in.
- **What:** `proxy.ts` now also runs on `/api/*` and, like `serverApi` and the token refresh, adds two headers for the API: `x-client-ip` (the first `X-Forwarded-For` entry, which Vercel and Caddy overwrite with the connecting address) and `x-api-proxy-secret`. Copies of these headers sent by the visitor are dropped first. Cached public reads (`revalidate`) skip them so the cache is not split per visitor. The API's `clientIp` middleware believes `x-client-ip` only when it is a valid IP and the secret matches `API_PROXY_SECRET` (compared in constant time); otherwise it keeps Express's own address. `ClientIpThrottlerGuard` keys the limits on that address, with the same IPv6 /64 grouping as before.
- **Why a secret and not `trust proxy`:** the API's hostname is public, and Vercel does not publish a fixed list of egress addresses, so trusting `X-Forwarded-For` from "the proxy" would let anyone pick their own address.
- **Without the secret** nothing changes: the API ignores the header and behaves as before. Set the same `API_PROXY_SECRET` (`openssl rand -base64 48`) in `apps/api/.env` on the server and in the Vercel project.
- Same design as Farsh (carpet ADR 0020) and Kronos (ADR 0016).
- **Logs:** pino redacts `x-api-proxy-secret` like the cookie and authorization headers.
