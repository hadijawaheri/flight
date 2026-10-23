# 0010 — Deploy-time migrations with migrate-mongo, and backups

Status: accepted · Date: 2026-10-20 · Revised: 2026-10-22

Context: production boots with `autoIndex` off (blueprint §7), so an index added to a schema never reached the
server, and the only data migration ran inside `PassengersService.onModuleInit` on every boot. There were no
backups and no firewall setup. The first version of this ADR used a hand-written runner and added Docker images;
both contradicted the blueprint (§13: `migrate-mongo`; §4: PM2 + Caddy, no Docker) and were replaced.

Decision:

- `migrate-mongo` (`apps/api/migrate-mongo-config.js`, ESM migrations in `apps/api/migrations/`, changelog in the
  `changelog` collection). `pnpm --filter @flysmart/api migrate` reads `DATABASE_URL` from `apps/api/.env`.
  `deploy.sh` runs it after the build and before the PM2 reload, so a failed migration leaves the old processes
  running.
- Every index is declared twice: in the Mongoose schema (for dev `autoIndex` and for readers) and in a migration
  (for production). `20261020000000-baseline-indexes` holds all indexes as of this ADR. `test/migrations.e2e-spec.ts`
  runs all migrations on an empty database and fails if `Model.diffIndexes()` reports any schema index missing,
  so the two cannot drift.
- `scripts/backup-mongo.sh` writes gzipped `mongodump` archives (mode 600, 14-day retention), passes the URI in a
  temp config file so the password stays out of `ps`, and optionally copies each archive off-site with rclone.
- `scripts/harden-server.sh` sets ufw to allow only SSH (rate-limited), 80 and 443.
- API logs use ISO timestamps.

Consequences: a deploy needs the database reachable before the reload. A new index means a new migration file
(`pnpm --filter @flysmart/api migrate:create <name>`); the e2e test points out a forgotten one.
