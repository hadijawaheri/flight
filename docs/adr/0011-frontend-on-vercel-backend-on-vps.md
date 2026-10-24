# 0011 — Frontend on Vercel, backend stays on the VPS

Status: accepted · Date: 2026-10-24 · Amends the deployment part of the blueprint (PM2 + Caddy for both apps)

Context: the web app should be deployable to Vercel while the NestJS API and MongoDB stay on the VPS. The
repository is already a pnpm monorepo with `apps/web` (Next.js), `apps/api` (NestJS) and `packages/contracts`
(shared Zod schemas), and the browser only ever talks to `/api/*` on the web origin, which Next rewrites to the API.
Auth cookies are httpOnly and `SameSite=Lax`, and `CrossSiteGuard` rejects cross-site writes.

Decision:

- **Keep the monorepo; do not split into `/frontend` and `/backend`.** Both apps depend on
  `packages/contracts`, and "request/response shapes live only in contracts" is a core rule. Two repos would
  need a published contracts package and lockstep releases; renaming the folders would break the lockfile,
  CI, PM2, Dockerless deploy scripts and the blueprint with no benefit. Vercel deploys the monorepo with
  Root Directory `apps/web`; the VPS keeps deploying `apps/api` with PM2.
- **Keep the `/api/*` rewrite as the browser-to-API path.** Next on Vercel proxies to the VPS, so cookies stay
  first-party and `SameSite=Lax` and `CrossSiteGuard` keep working. Calling the VPS directly from the browser
  would need `SameSite=None` cookies and would turn the CSRF guard off for the web app, so it is not done.
- **`NEXT_PUBLIC_API_URL`** is the one variable to set on Vercel: the public HTTPS origin of the API. It is read
  by `next.config.ts` (rewrites), `proxy.ts` (token refresh) and server components through
  `src/lib/api-origin.ts`. `INTERNAL_API_URL` still wins when set, so the PM2 deployment is unchanged. A Vercel
  build without either variable fails instead of shipping a site pointed at localhost.
- **API CORS allowlist.** `CORS_ORIGINS` accepts exact origins and scoped wildcards (`*` = one hostname label,
  e.g. `https://flysmart-*-myteam.vercel.app` for previews). Bare `*` and wildcards directly under a shared
  suffix (`https://*.vercel.app`) are rejected at boot, because any Vercel user could then call the API with
  credentials. Requests without an `Origin` header (Vercel's server-side calls, curl) are not CORS requests
  and pass. Since the browser is same-origin, CORS is a second line of defence for direct calls.
- **Vercel build is DB-free.** `output: "standalone"` and `postbuild.mjs` apply only off Vercel. The only build-time
  API call (sitemap) already tolerates the API being down.
- Scripts: `build:frontend`, `build:backend`, `start:backend` at the root; `apps/web/vercel.json` uses
  `build:frontend`.

Consequences:

- The API needs a public HTTPS hostname (Caddy block in `infra/Caddyfile`). Its port stays firewalled to
  loopback; only Caddy is public.
- Rate limits and `trust proxy: 1` now see the proxy hop in front of the API, which can be Vercel's egress
  address rather than the visitor. Check throttling after the first deploy (`X-Forwarded-For` handling) before
  relying on per-IP limits.
- Changing `NEXT_PUBLIC_API_URL` needs a redeploy, because rewrites are fixed at build time.
- Latency: each page that calls the API server-side now crosses the internet (Vercel region to VPS). Choose a
  Vercel function region close to the VPS.
- Hosting and reachability from Iran are unverified; the PM2 + Caddy path remains the fallback.
