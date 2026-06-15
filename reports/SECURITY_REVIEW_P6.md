# Security Review — Phase 6 (T86)

**Date:** 2026-06-11  
**Scope:** Self-registration, role PATCH, employee portal  
**Verdict:** ✅ PASS (no critical)

## Register flow

| Check | Status |
|-------|--------|
| `line_register_uid` cookie httpOnly, 10 min TTL | ✅ |
| Register API requires valid cookie | ✅ |
| Duplicate LINE ID → 23505 handled | ✅ |
| Inactive employee → 403 | ✅ |

## Role escalation

| Check | Status |
|-------|--------|
| PATCH role/branch_id — HR/admin only | ✅ |
| CEO employee profile read-only | ✅ |
| Assignable roles whitelist (no dev via UI) | ✅ |

## Portal

| Check | Status |
|-------|--------|
| `/portal/*` requires session | ✅ |
| Non-employee roles redirected to admin | ✅ |
| Attendance/documents RLS self-read | ✅ (existing RLS) |

## Recommendations (non-blocking)

- Rotate production API keys post-handoff
- Vault `secret_key` → `sb_secret_*` for Edge Function crons (T84)
- Rate-limit `/api/auth/register` if abuse observed
