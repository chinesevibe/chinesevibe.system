#!/usr/bin/env bash
# Apply pending Supabase migrations to linked remote (oouswalwqhojpzqwwdvs).
# Run from hr-app/: npm run db:push:remote
#
# Requires SUPABASE_DB_PASSWORD if CLI cannot use stored credentials:
#   Supabase Dashboard → Project Settings → Database → Database password
#   export SUPABASE_DB_PASSWORD='...'   # never commit

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Note: SUPABASE_DB_PASSWORD is not set."
  echo "If push fails, export it from Supabase Dashboard → Database password."
fi

echo "Dry run..."
npx supabase db push --dry-run --include-all --linked

echo ""
echo "Applying migrations..."
npx supabase db push --include-all --linked

echo ""
echo "Done. Verify: npx supabase migration list --linked"
