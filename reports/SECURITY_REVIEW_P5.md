# Security Review — Phase 5

**Date:** 2026-06-10  
**Scope:** T76–T95 (branches, two-tier approval, payroll hours)

## Verdict: PASS (with notes)

### Authorization
- Branch APIs: HR/admin only for write; managers scoped via `hr_managed_branch_id()`.
- Attendance/leave decide: manager limited to own branch employees; HR final step.
- OT request: `branch_manager` only; target employee must share branch.
- Payroll ledger: HR/admin via service role in `recordPayrollHours`.

### RLS
- `hr_branches`, `hr_attendance_submissions`, `hr_payroll_*`: branch-scoped or HR-only policies.
- Leave update: manager can act only on `pending_manager` in managed branch.

### Notes
- Branch manager can access `/admin/manager` but not full HR modules — page-level `requireRole` on sensitive routes.
- 48h expiry cron requires vault secrets (same as Phase 3 crons).
- `window.prompt` on reject in ApprovalQueue — acceptable for MVP; replace with modal in polish pass.
