# Security Review — Phase 5.1 (T76)

**Date:** 2026-06-11  
**Scope:** LINE BM notify, cron vault alignment, branch nav badges

## Findings

| Area | Verdict | Notes |
|------|---------|-------|
| `notifyBranchManager` | PASS | Uses service role server-side only; no token in client |
| LINE push content | PASS | No PII beyond employee name + dates; link to admin path |
| Cron migration | PASS | Uses vault secrets; no keys in SQL body |
| Nav badges | PASS | Counts from existing manager queue (RLS-scoped session) |
| Error handling | PASS | BM notify best-effort; failures logged, not exposed to user |

## Recommendations

- Register vault `project_url` + `secret_key` on remote Supabase if cron still skipped
- Ensure Branch Manager has `line_user_id` before expecting push delivery

**Verdict:** APPROVED for deploy
