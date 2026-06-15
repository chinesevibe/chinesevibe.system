# T28 Deploy Checklist — 2026-06-11

## Production URLs

| Service | URL |
|---------|-----|
| **Vercel (production)** | https://hr-app-two-iota.vercel.app |
| **Supabase project** | https://oouswalwqhojpzqwwdvs.supabase.co |
| **Supabase dashboard** | https://supabase.com/dashboard/project/oouswalwqhojpzqwwdvs |
| **Vercel dashboard** | https://vercel.com/latinzx-8395s-projects/hr-app |

## Gate 1 — Build & Quality

- [x] `npm run build` — PASS
- [x] `npm run typecheck` — PASS
- [x] `npm run lint` — PASS (1 warning, 0 errors)
- [x] `npm run test:e2e` — PASS (23/23)

## Gate 2 — Security

- [x] No hardcoded secrets in `src/`
- [x] `.env.local` not committed
- [x] API keys via Vercel env + Supabase vault only

## Gate 3 — Database Migrations

- [x] Supabase project `hr-payroll` created (`oouswalwqhojpzqwwdvs`, ap-southeast-1)
- [x] `supabase link` + `supabase db push` — 9 migrations applied
- [x] Vault secrets `project_url` + `secret_key` set for pg_cron
- [x] Cron jobs active: `morning-push`, `probation-alert`, `visa-alert`, `evening-summary`

## Gate 4 — Environment Variables (Vercel Production)

- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `LINE_CHANNEL_ACCESS_TOKEN`
- [x] `LINE_CHANNEL_SECRET`
- [x] `NEXT_PUBLIC_LINE_LIFF_ID`
- [x] `LINE_LOGIN_CHANNEL_ID`
- [x] `LINE_LOGIN_CHANNEL_SECRET`
- [x] `NEXT_PUBLIC_BASE_URL` → `https://hr-app-two-iota.vercel.app`
- [x] `LINE_USER_CHAT_ENABLED`, `WORK_START_HOUR`, `WORK_START_MINUTE`

## Gate 5 — Edge Functions (Supabase)

- [x] `probation-alert` deployed
- [x] `visa-alert` deployed
- [x] `evening-summary` deployed
- [x] `morning-push` deployed
- [x] Supabase secrets: LINE tokens + work hours

## Gate 6 — Post-Deploy Smoke

- [x] `/login` — 200, LINE login button renders
- [x] `/admin` — redirects to login (unauthenticated)
- [x] `POST /api/line/webhook` without signature — 401 (expected)
- [x] Admin seed: `U07b33302852e4917c6c680fd4dc7592e` registered as `admin`

## Gate 7 — Monitoring

- [ ] Sentry — SKIP (not configured for MVP)
- [ ] UptimeRobot — SKIP (manual setup recommended)

## Manual Steps Required (LINE Developers Console)

Update these in [LINE Developers Console](https://developers.line.biz/):

### Messaging API channel
- **Webhook URL:** `https://hr-app-two-iota.vercel.app/api/line/webhook`
- Enable **Use webhook**
- Click **Verify** (expect 200)

### LINE Login channel
- **Callback URL:** `https://hr-app-two-iota.vercel.app/api/auth/line/callback`

### LIFF app (`2010360838-EqD4V9Xa`)
- **Endpoint URL:** `https://hr-app-two-iota.vercel.app/liff/leave` ✅ (updated via LIFF API 2026-06-11)
- Check-in QR ใช้ direct URL `/liff/checkin?token=...` ไม่ผ่าน LIFF endpoint

## Rollback Plan

1. `vercel rollback` — revert to previous deployment
2. Supabase: pause project or restore from backup if schema issue
3. LINE webhook: point back to ngrok/local URL

## Notes

- **Git auto-deploy:** https://github.com/latinzx-gif/hr-payroll-client → Vercel `hr-app` (branch `main` → production)
- `HR_LINE_GROUP_ID` empty — alerts ส่ง multicast ไป admin/hr แทน; ใส่ group ID เมื่อมีกลุ่ม HR LINE
