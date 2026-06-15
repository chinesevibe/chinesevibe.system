# Security Review — Phase 4

**Date:** 2026-06-10  
**Scope:** T61–T75 (cron, runtime settings, dashboard, reports export, payroll hub, lifecycle, contract-alert)

## Verdict: PASS (with notes)

### Authorization
- `/api/settings/runtime` GET/PATCH: HR/admin via `getCurrentEmployee()`; keys whitelisted (`work_start_hour`, `work_start_minute`, `hr_line_group_id`).
- `/api/reports/export` GET: HR/admin only; type enum (`attendance` | `leave` | `overtime`); row limits 2000–5000.
- `/api/employees/[id]/lifecycle` POST: HR/admin only; probation outcome enum validated; renewal fields nullable dates.

### RLS
- `hr_runtime_config`: select + all (upsert) for `hr_is_hr_admin()` — replaces service-only access from Phase 3.
- `hr_compliance_notes`: HR select/insert; tied to `employee_id` FK cascade.

### Edge functions
- `contract-alert`: `withSupabase({ auth: ["secret"] })` — cron/pg_net secret required; no JWT bypass.

### Data exposure
- CSV export includes employee name + department — within existing HR admin scope; no new public endpoints.
- Payroll hub is read-only salary display + document link — no calculation or bulk export added.

### Notes
- `hr_line_group_id` stored in DB is sensitive for LINE group targeting — restrict HR admin accounts in production.
- Contract-alert creates `hr_alerts` rows; dedup relies on daily cron idempotency (same trigger_date may re-insert if not guarded) — acceptable for MVP; consider unique constraint in Phase 5.
