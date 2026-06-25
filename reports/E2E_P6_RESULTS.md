# E2E Phase 6 Results

**Date:** 2026-06-11  
**Environment:** https://hr-app-rho-blush.vercel.app

## Automated

| Script | Result |
|--------|--------|
| `scripts/e2e/smoke-role-routes.mjs` | ✅ 8/8 PASS |
| `scripts/e2e/flow-onboarding.mjs` | ✅ routes/API smoke PASS |
| `npm run build` | ✅ PASS |
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS (1 pre-existing warning) |

## Portal routes (new)

| Route | HTTP |
|-------|------|
| `/portal` | 307 (auth) |
| `/portal/profile` | 307 |
| `/portal/attendance` | 307 |
| `/portal/leave` | 307 |
| `/portal/documents` | 307 |
| `/register` | 307→login / 200 |

## Portal + lite routes (automated 2026-06-10)

| Route | HTTP |
|-------|------|
| `/portal` … `/portal/schedule` | 307 (auth) |
| `/register` | 307 |
| `/admin/recruitment` … `/performance` | 307 |
| `/liff/overtime` | 200 |

## Manual (LINE OAuth) — optional

- [ ] New LINE user → `/register` → `/portal` or `/liff/leave`
- [ ] HR filter `?status=onboarding` → assign role/branch
- [ ] Employee portal widgets show real data
