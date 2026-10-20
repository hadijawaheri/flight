#!/usr/bin/env bash
# Daily MongoDB backup. Run on the server from the repo root; cron example in docs/server-hardening.md.
# Needs mongodump (mongodb-database-tools). Optional: BACKUP_RCLONE_REMOTE=remote:bucket/path copies
# each archive off the server, which is what makes it a backup rather than a second copy on one disk.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/flysmart}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# Read DATABASE_URL from the API's env file unless it is already set
if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' apps/api/.env | head -n1 | cut -d= -f2-)"
fi
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is not set and not found in apps/api/.env" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
archive="$BACKUP_DIR/flysmart-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"

# --uri on the command line would show the password in `ps`; a config file keeps it private
config="$(mktemp)"
trap 'rm -f "$config"' EXIT
chmod 600 "$config"
printf 'uri: "%s"\n' "$DATABASE_URL" > "$config"

mongodump --config="$config" --archive="$archive" --gzip --quiet
chmod 600 "$archive"
echo "Backup written: $archive ($(du -h "$archive" | cut -f1))"

if [[ -n "${BACKUP_RCLONE_REMOTE:-}" ]]; then
  rclone copy "$archive" "$BACKUP_RCLONE_REMOTE"
  echo "Copied to $BACKUP_RCLONE_REMOTE"
fi

find "$BACKUP_DIR" -name 'flysmart-*.archive.gz' -mtime +"$KEEP_DAYS" -delete
