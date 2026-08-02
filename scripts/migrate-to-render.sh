#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# migrate-to-render.sh
# Dumps data from Replit's Postgres and restores it into Render's Postgres.
#
# Usage (run from the workspace root in Replit Shell):
#   chmod +x scripts/migrate-to-render.sh
#   RENDER_DB_URL="<your-render-internal-or-external-db-url>" bash scripts/migrate-to-render.sh
#
# Get RENDER_DB_URL from Render Dashboard → santechdata-db → External Database URL
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL (Replit source DB) is not set." >&2
  exit 1
fi

if [ -z "${RENDER_DB_URL:-}" ]; then
  echo "ERROR: RENDER_DB_URL (Render target DB) is not set." >&2
  echo "  Export it first:  export RENDER_DB_URL='postgres://...'" >&2
  exit 1
fi

DUMP_FILE="/tmp/santech_dump_$(date +%Y%m%d_%H%M%S).sql"

echo "→ Dumping Replit database to $DUMP_FILE ..."
pg_dump --no-owner --no-acl "$DATABASE_URL" > "$DUMP_FILE"

echo "→ Restoring into Render database ..."
psql "$RENDER_DB_URL" < "$DUMP_FILE"

echo "✓ Migration complete."
echo "  Remember to run Drizzle migrations on Render if the schema has changed:"
echo "  npx drizzle-kit push  (from lib/db with RENDER_DB_URL as DATABASE_URL)"
