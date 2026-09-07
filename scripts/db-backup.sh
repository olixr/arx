#!/usr/bin/env bash
# Dump the Arx Postgres database before anything irreversible touches
# it (a deploy runs forward-only migrations — v45/v46 were destructive
# data moves — and there is no down path). Custom-format (-Fc) so a
# single table can be restored with pg_restore -t; dated file; older
# dumps past RETENTION_DAYS are pruned.
#
#   scripts/db-backup.sh                 # → $BACKUP_DIR/arx-YYYYmmdd-HHMMSS.dump
#   BACKUP_DIR=/var/backups/arx RETENTION_DAYS=14 scripts/db-backup.sh
#
# Connection parts come from the release .env (DB_HOST / DB_PORT /
# DB_DATABASE / DB_USERNAME / DB_PASSWORD) — the same file arx-run.sh
# sources — with the same <repo>/.env → ../.env fallback. Restore:
#   pg_restore -d arx --clean --if-exists <file>
set -euo pipefail
cd "$(dirname "$0")/.."

# The deploy runs this before the restart under `set -e`: a box without
# postgresql-client fails HERE, by name, not three lines down.
command -v pg_dump >/dev/null 2>&1 || {
  echo "db-backup: pg_dump not found — install postgresql-client (the deploy's hard prerequisite)" >&2
  exit 1
}

ENV_FILE=".env"
[ -f "$ENV_FILE" ] || ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ENV_FILE"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-../backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_NAME="${DB_DATABASE:-arx}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

args=(-Fc --no-owner --no-acl -f "$OUT")
[ -n "${DB_HOST:-}" ] && args+=(-h "$DB_HOST")
[ -n "${DB_PORT:-}" ] && args+=(-p "$DB_PORT")
[ -n "${DB_USERNAME:-}" ] && args+=(-U "$DB_USERNAME")
[ -n "${DB_PASSWORD:-}" ] && export PGPASSWORD="$DB_PASSWORD"

pg_dump "${args[@]}" "$DB_NAME"
echo "backup: $OUT ($(du -h "$OUT" | cut -f1))"

# Retention: only our own dated dumps, only past the window.
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}-*.dump" -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/pruned: /' || true
