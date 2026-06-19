#!/usr/bin/env bash
# Clear public data on target Supabase project via psql.
#
# Usage (from hr-app/):
#   export SUPABASE_DB_PASSWORD='your-db-password'
#   ./scripts/supabase/cleanup-target.sh cpyuibcrpfslgcazozid
#
# Or one-liner:
#   SUPABASE_DB_PASSWORD='...' ./scripts/supabase/cleanup-target.sh cpyuibcrpfslgcazozid

set -euo pipefail

REF="${1:-cpyuibcrpfslgcazozid}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Error: set SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database password)"
  exit 1
fi

URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${REF}.supabase.co:5432/postgres"

echo "Target: ${REF}"
echo "Running cleanup-target-public.sql (TRUNCATE public tables)..."
psql "$URL" -v ON_ERROR_STOP=1 -f "${SCRIPT_DIR}/cleanup-target-public.sql"

echo "Done."
