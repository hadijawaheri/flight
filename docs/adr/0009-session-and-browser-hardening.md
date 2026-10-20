# 0009 — Session limits, re-authentication, cross-site writes and CSP

Status: accepted · Date: 2026-10-20

Context: a security review against a common web checklist found gaps that matter for a site that takes
payments and stores passport data. A refresh token got a fresh 30 days on every rotation, so an active
session never ended and there was no way to end other devices' sessions. Account deletion trusted the session
cookie alone. CSRF protection rested only on `SameSite=Lax`. The web pages had no Content-Security-Policy.
And `ALLOW_DEV_AUTH=true` was hard-coded in the PM2 file, so the fixed OTP could not be switched off on the
server, while switching it off also forbade the simulated gateway the demo depends on.

Decision:

- Refresh chains carry `familyExpiresAt` (30 days from sign-in). Each rotation gets
  `min(now + 7 days, familyExpiresAt)`, so idle sessions end after a week and every session after 30 days.
  Tokens from before this change get the absolute limit on their next rotation. `POST /v1/auth/logout-all`
  revokes every chain of the user; access tokens already issued stay valid for their 15 minutes.
- Irreversible actions need a fresh OTP to the user's own mobile: `POST /v1/auth/reauth/request`, then
  `POST /v1/auth/account/delete { code }`, which also revokes all sessions. `DELETE /v1/users/me` is gone. Both
  live in `AuthController` because `AuthModule` already depends on `UsersModule`.
- `CrossSiteGuard` (global, before throttling) rejects POST/PUT/PATCH/DELETE whose `Sec-Fetch-Site` is
  `cross-site` or `same-site`. It does not compare Origin with Host: the request crosses the Cloudflare Worker,
  Caddy and the Next rewrite, which rewrite hosts. Requests without the header (server-side calls, old browsers)
  pass; `SameSite=Lax` still covers them. A future gateway callback opts out with `@AllowCrossSite()` and must
  verify the gateway's own signature.
- The Next proxy issues a per-request nonce and a CSP with `'strict-dynamic'`, following the Next CSP guide.
  The root layout reads the nonce, which makes every page dynamic (they already were, except the not-found
  page). Styles keep `'unsafe-inline'` because Radix, sonner and next/font write inline styles.
- `ALLOW_DEV_AUTH` is read only from `apps/api/.env`. `ALLOW_SIMULATED_PAYMENTS` lets production run real
  SMS sign-in (new `MelipayamakSmsProvider`, approved-pattern OTP) with the simulated gateway.

Consequences: users inactive for a week sign in again. Any new third-party script needs a CSP change. The
Melipayamak request shape follows its console REST docs and has only been tested against mocks.
