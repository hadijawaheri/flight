# Build from the repo root: docker build -f apps/api/Dockerfile -t flysmart-api .
FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @flysmart/contracts build && pnpm --filter @flysmart/api build
# A self-contained copy of the API with production dependencies only
RUN pnpm --config.inject-workspace-packages=true --filter @flysmart/api deploy --prod /out

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=7791
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 7791
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
