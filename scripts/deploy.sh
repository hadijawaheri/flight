#!/usr/bin/env bash
# Run on the server from the repo root. Stops before the PM2 reload if install or build fails.
# Note: `next build` rewrites .next while the old web process is still running; keep deploys short and off-peak.
set -euo pipefail

git pull --ff-only

# ALLOW_DEV_AUTH moved from PM2 to apps/api/.env; keep the old behaviour until it is set there
if ! grep -q '^ALLOW_DEV_AUTH=' apps/api/.env; then
  echo "ALLOW_DEV_AUTH=true" >> apps/api/.env
  echo "WARNING: ALLOW_DEV_AUTH=true was added to apps/api/.env; anyone can sign in with the fixed code." >&2
fi
corepack enable
pnpm install --frozen-lockfile
# INTERNAL_API_URL is baked into the Next rewrites at build time
INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:7791}" pnpm build
# Production boots with autoIndex off: indexes and data migrations are applied here, before reload
pnpm --filter @flysmart/api migrate
pm2 startOrReload infra/ecosystem.config.cjs --update-env
pm2 save
