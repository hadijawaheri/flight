# 0010 — Deploy-time migrations, backups and container images

Status: accepted · Date: 2026-10-20

Context: production boots with `autoIndex` off, so an index added to a schema never reached the server, and the
only data migration ran inside `PassengersService.onModuleInit` on every boot. There were no backups, no
firewall setup, and no images for running the stack outside PM2.

Decision:

- `pnpm --filter @flysmart/api migrate` (`src/migrate.ts`) boots the app context with the sweepers off, calls
  `createIndexes()` on every registered model (additive, never drops), then applies `MIGRATIONS` in order and
  records each id in a `migrations` collection. `deploy.sh` runs it after the build and before the PM2 reload, so
  a failed migration leaves the old processes running. The boot-time passenger index migration became
  `0001-drop-legacy-passenger-national-id-index`. A hand-rolled runner was chosen over migrate-mongo because it
  reuses the Nest config and Mongoose models and adds no dependency.
- `scripts/backup-mongo.sh` writes gzipped `mongodump` archives (mode 600, 14-day retention), passes the URI in
  a temp config file so the password stays out of `ps`, and optionally copies each archive off-site with rclone.
- `scripts/harden-server.sh` sets ufw to allow only SSH (rate-limited), 80 and 443.
- `apps/api/Dockerfile` (pnpm deploy with injected workspace packages) and `apps/web/Dockerfile` (Next
  standalone) build from the repo root. `infra/docker-compose.prod.yml` runs Mongo with auth and a key file, a
  one-shot init that creates a `readWrite`-only app user, migrate, API, web and Caddy. Only Caddy publishes ports.
- API logs use ISO timestamps.

Consequences: a deploy now needs the database to be reachable before the reload. Adding a migration means
appending to `MIGRATIONS` and never renaming an id.
