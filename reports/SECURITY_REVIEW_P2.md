# Security Review — Phase 2 (T43)

**Date:** 2026-06-10  
**Scope:** F7 Document Request, F8 Complaint, F9 Announcements  
**Baseline:** `SECURITY_REVIEW_T26.md`

## Summary

Phase 2 tables use existing RLS helpers (`hr_employee_id()`, `hr_is_hr_admin()`). No new public anon policies. Service-role usage limited to announcement broadcast and LINE webhook announcement list (read-only sent rows).

## Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| P2-01 | Info | Document requests: employees insert/select own; HR update | OK |
| P2-02 | Info | Complaints anonymous: `employee_id` null, HR-only identity | OK |
| P2-03 | Low | Anonymous complainants cannot receive LINE reply (by design) | Accepted |
| P2-04 | Info | `hr-documents` storage: HR write, employee read own folder | OK |
| P2-05 | Info | Announcement broadcast uses service role + active employees only | OK |
| P2-06 | Info | API routes enforce HR role for decide/reply/announcement POST | OK |

## P0/P1

**None identified** in Phase 2 diff.

## Recommendations

1. Apply migration `20260611190000_phase2_support_features.sql` on production Supabase before deploy.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Manual UAT: anonymous complaint + announcement multicast with real LINE users.
