# Security Review — Phase 3

**Date:** 2026-06-10  
**Scope:** T46–T60 (OT, summaries, reports, org, settings, doc upload, scheduled announcements)

## Verdict: PASS (with notes)

### Authorization
- OT request/decide APIs: `getCurrentEmployee()` + HR/admin for decide — consistent with leave/doc patterns.
- `/api/departments`: HR/admin only for POST.
- Document upload: HR/admin only; file type/size validated (PDF/JPEG/PNG, 5MB).
- Announcements schedule: HR/admin only; future `scheduled_at` enforced.

### RLS
- `hr_overtime_requests`: employee read own; HR update; employee insert own.
- `hr_departments`: HR write; authenticated read for dropdowns.

### Storage
- Uploads to `hr-documents` bucket with signed URLs (7-day TTL). Path sanitized.

### Edge functions
- `weekly-summary`, `monthly-summary`, `announcement-scheduler`: `withSupabase({ auth: ["secret"] })` — cron secret required.

### Notes
- Signed URLs in LINE messages expose file for 7 days — acceptable for HR doc delivery; consider shorter TTL if policy requires.
- Reports page is read-only tabular export; no PII export API beyond existing admin session scope.
