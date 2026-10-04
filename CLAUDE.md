# FlySmart — Agent Rules

Source of truth: PROJECT_BLUEPRINT_SHADCN.md. This file is the short, always-loaded subset.

## Commands

- `pnpm dev` | `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm build`
- API e2e tests start an in-memory Mongo replica set. Offline, point them at a local binary:
  `MONGOMS_SYSTEM_BINARY=$(which mongod) MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false pnpm test`
- Web e2e: `pnpm --filter @flysmart/web build && pnpm --filter @flysmart/web test:e2e` (needs MongoDB and apps/api/.env with OTP_FIXED_CODE=123456)
- Use pnpm only. The lockfile is committed. TypeScript and ESLint are pinned in the pnpm catalog on purpose.

## Architecture

- apps/api (NestJS :7781, ESM, relative imports with `.js`), apps/web (Next :7782), packages/contracts (Zod, shared).
- Request/response shapes live ONLY in packages/contracts. Never redefine them in an app.
- API envelope: `{ data }` | `{ data, meta }` | `ApiErrorBody`. Never return raw documents; use mappers.
- The browser only talks to `/api/*` on the web origin (Next rewrite). Tokens are httpOnly cookies.

## Code

- TS strict, no `any`, `catch (e: unknown)`. kebab-case files, named exports, no `I` prefix.
- Mongoose `@Prop` always gets an explicit `type` and values used in decorators are value imports (no `import type`).
- Comments explain WHY only. Imports are sorted by ESLint.
- `page.tsx` = routing only. `"use client"` only on leaves.

## UI (shadcn, RTL)

- Semantic tokens only. No raw colors, no `dark:` overrides, no `space-x/y`.
- Logical classes only (ms/me/ps/pe/start/end). Directional icons: `rtl:rotate-180`.
- Forms: FieldGroup + Field + Controller (RHF + Zod). LTR fields: `dir="ltr"` + `text-start`.
- Run `pnpm dlx shadcn@latest docs <component>` before using a component.

## Done means

typecheck + lint + tests actually run and green, loading/empty/error states handled, ADR for new decisions.
