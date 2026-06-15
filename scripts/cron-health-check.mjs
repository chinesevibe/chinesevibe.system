#!/usr/bin/env node
/**
 * Cron health checklist (T84) — run against Supabase via SQL or document checks.
 * Local mode: prints SQL to run in Supabase SQL editor.
 *
 * Usage:
 *   node scripts/cron-health-check.mjs
 */

const SQL = `
-- Active cron jobs
select jobname, schedule, active from cron.job order by jobname;

-- Vault secrets (names only)
select name from vault.secrets where name in ('project_url', 'secret_key');

-- Recent approval-expiry runs (if logged)
select * from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'approval-expiry' limit 1)
order by start_time desc limit 5;
`

console.log("Cron health check (T84)\n")
console.log("Run in Supabase SQL Editor (project oouswalwqhojpzqwwdvs):\n")
console.log(SQL)
console.log("\nExpected:")
console.log("  - approval-expiry: active, schedule 0 * * * *")
console.log("  - vault: project_url + secret_key present")
console.log("  - Edge Function crons: secret_key should be sb_secret_* if 401")
