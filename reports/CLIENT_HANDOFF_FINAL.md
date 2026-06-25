# Client Handoff — Final (T107)

**Project:** CNV WorkHub  
**Date:** 2026-06-11  
**Production:** https://hr-app-rho-blush.vercel.app

## What's new since Phase 5 handoff

1. **Self-register** — LINE login → `/register` → employee LIFF/portal
2. **HR onboarding queue** — `/admin/employees?status=onboarding`
3. **Employee Web Portal v2** — `/portal` (profile, attendance, leave, documents, announcements, stock)
4. **Dual channel LINE + Portal** — พนักงานใช้ Rich Menu / slash commands ใน LINE หรือ Portal ตามสิทธิ์
5. **Rich Menu v3 (2×3)** — เช็คอิน | OT | เอกสาร / ลา | ร้องเรียน | ติดต่อ HR (คลังแยกเป็นคำสั่ง)
6. **Slash commands** — `/leave` `/ot` `/doc` `/complaint` `/announce` `/stock` `/inbound` (ทำงานแม้ปิด free-text chat)
7. **OT** — พนักงานยื่นเองผ่าน LIFF → BM อนุมัติ → HR อนุมัติ
8. **คลังสินค้า** — `/stock` หรือ `/portal/stock` ดูยอด · `/inbound` หรือ `/portal/inbound` สแกนรับเข้า (เมื่อ `LINE_STOCK_COMMAND_ENABLED=true`)
9. **ประกาศ** — HR ส่งจาก `/admin/announcements` (LINE push) · พนักงานดูย้อนหลังที่ `/portal/announcements`

## Key URLs

| Surface | URL |
|---------|-----|
| Login | `/login` |
| Register | `/register` |
| Employee portal | `/portal` |
| Portal inbound scan | `/portal/inbound` |
| LIFF inbound scan | `/liff/inbound-scan?order=<uuid>` |
| HR admin | `/admin` |
| CEO | `/admin/ceo` |
| Branch Manager | `/admin/branch` |

## Runbook

### Deploy

```bash
cd hr-app && npx vercel --prod --yes
```

### Smoke

```bash
node scripts/e2e/smoke-role-routes.mjs
node scripts/e2e/flow-onboarding.mjs
```

### Cron health

```bash
node scripts/cron-health-check.mjs
# Run printed SQL in Supabase dashboard
```

### Key rotation (recommended post-handoff)

1. Supabase → rotate service role → update Vercel env
2. LINE channel secret / access token
3. Update Vault `secret_key` with new `sb_secret_*`

## Out of scope (Phase 9 CR)

- Payslip PDF / baht payroll calculation (T96–T101)

## Support

See `CLIENT_HANDOFF_P5.md` for CNV WorkHub (LINE), Supabase, BM setup details.
