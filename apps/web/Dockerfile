# Build from the repo root: docker build -f apps/web/Dockerfile --build-arg INTERNAL_API_URL=http://api:7791 -t flysmart-web .
FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# The /api rewrite target is fixed at build time (see next.config.ts)
ARG INTERNAL_API_URL=http://api:7791
# Canonical URL for metadata and the sitemap; set it to the public domain
ARG NEXT_PUBLIC_SITE_URL=http://localhost:7792
ENV INTERNAL_API_URL=$INTERNAL_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @flysmart/contracts build && pnpm --filter @flysmart/web build

FROM node:24-slim
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=7792 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Standalone output keeps the monorepo layout: server.js lives under apps/web
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 7792
CMD ["node", "apps/web/server.js"]
