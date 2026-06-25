# E2E / Smoke — Phase 5.1 (T76)

**Date:** 2026-06-11  
**Base URL:** https://hr-app-rho-blush.vercel.app

## smoke-role-routes.mjs

| Route | Status | Result |
|-------|--------|--------|
| `/login` | 200 | PASS |
| `/admin` | 307 → login | PASS (no 5xx) |
| `/admin/ceo` | 307 | PASS |
| `/admin/branch` | 307 | PASS |
| `/admin/branch/attendance` | 307 | PASS |
| `/admin/branch/leaves` | 307 | PASS |
| `/admin/branch/overtime` | 307 | PASS |
| `/admin/branch/team` | 307 | PASS |

**Verdict:** All routes respond without server error (unauthenticated redirect expected).
