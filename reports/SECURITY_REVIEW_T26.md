# Security Review — T26

**Date:** 2026-06-11  
**Project:** `hr-app` (LINE OA HR & Payroll)  
**Reviewer:** Cursor (EXECUTE per skill 10)

## Verdict

🟢 **PASS** (conditional) — ไม่มี P0 blocker ในโค้ด; ต้องตั้งค่า production env + LINE OA Bot mode ก่อน deploy

---

## Critical Issues (P0)

*ไม่มี — ไม่พบช่องโหว่ที่ต้องแก้ก่อน deploy*

---

## Warnings (P1 — แก้ได้ก่อน/หลัง demo)

| # | หัวข้อ | รายละเอียด | แนะนำ |
|---|--------|------------|--------|
| W1 | QR replay ภายในวัน | QR token ใช้ได้ทั้งวัน ICT — ถ่ายรูป QR แล้วเช็คอินแทนได้ (จำกัด 1 ครั้ง/วัน) | ยอมรับตาม T11; เปลี่ยน QR บ่อย / ใช้ geo เป็นหลัก |
| W2 | `line_id` ใน dev login | callback ใส่ `line_id` query เมื่อ `NODE_ENV=development` | ห้าม `development` บน production |
| W3 | Storage delete | `leave-attachments` มี insert/select ไม่มี delete | เพิ่ม policy delete สำหรับ hr ใน phase ถัดไป |
| W4 | Edge fn `verify_jwt=false` | ใช้ `withSupabase({ auth: ["secret"] })` แทน | ตรวจ vault `secret_key` บน remote ก่อน cron ทำงาน |
| W5 | LINE chat UI | โค้ดปิดตอบ text แล้ว (`LINE_USER_CHAT_ENABLED` default off) | ปิด Chat mode ใน LINE OA Manager ด้วย |

---

## Checklist Results

| Check | Result | Notes |
|-------|--------|-------|
| **A Secrets** | ✅ PASS | ไม่มี hardcoded `sk-`/Bearer ใน `src/`; secrets ผ่าน `process.env`; `.env*` ใน `.gitignore` |
| **B RLS** | ✅ PASS | 5 tables `hr_*` — RLS enabled + policies ใน `20260610042343_init_hr_schema.sql`; helpers `hr_employee_id()` / `hr_is_hr_admin()` |
| **C Route protection** | ✅ PASS | `/admin` → proxy session + `requireRole(hr,admin)`; API แต่ละ route มี auth เอง |
| **D Input validation** | ✅ PASS | leave/checkin/employee PATCH validate body; upload type/size limits |
| **E CORS/Headers** | ✅ PASS | `next.config.ts` ไม่เปิด wildcard CORS |
| **F LINE webhook** | ✅ PASS | `verifyLineSignature` on raw body; fail closed ถ้าไม่มี secret/signature |
| **G Edge Functions** | ✅ PASS | morning/probation/visa/evening — `auth: ["secret"]` |
| **H Storage** | ✅ PASS | private bucket; insert own folder; select own or hr |
| **I Auth / LINE Login** | ✅ PASS | OAuth state cookie; CSRF state check; employee ต้อง active + ลงทะเบียน |

---

## API Route Matrix

| Route | Auth | หมายเหตุ |
|-------|------|----------|
| `POST /api/line/webhook` | X-Line-Signature | 401 ถ้า signature ผิด |
| `GET/POST /api/auth/line/*` | OAuth flow | state cookie |
| `POST /api/leave/request` | Session + active employee | RLS insert own |
| `POST /api/leave/[id]/decide` | hr/admin | RLS update hr only |
| `PATCH /api/employees/[id]` | hr/admin | |
| `POST /api/checkin` | HMAC day-bound token | ไม่มี session (by design) |
| `GET /api/checkin/qr` | hr/admin | service role lookup |
| `POST /api/auth/logout` | session | |

---

## RLS Summary

| Table | Employee | HR/Admin |
|-------|----------|----------|
| `hr_employees` | SELECT own | CRUD |
| `hr_attendance` | SELECT/INSERT/UPDATE own | full |
| `hr_leaves` | SELECT/INSERT own | UPDATE status |
| `hr_leave_balances` | SELECT own | manage |
| `hr_alerts` | — | CRUD |

Server paths (webhook check-in, cron) ใช้ `service_role` โดยเจตนา — ไม่เปิดให้ client

---

## Tests Run

```bash
node scripts/test-security-webhook.mjs   # 4/4
node scripts/test-leave-request.mjs      # 10/10
node scripts/test-employee-profile.mjs   # 7/7
npm run build && npm run typecheck && npm run lint
```

---

## Pre-Deploy Gates (T28)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` เฉพาะ server/Vercel — ไม่ใช้ `NEXT_PUBLIC_*`
- [ ] `LINE_CHANNEL_SECRET` + `LINE_CHANNEL_ACCESS_TOKEN` ใน env production
- [ ] `NEXT_PUBLIC_BASE_URL` = production URL (HTTPS)
- [ ] LINE Webhook URL ชี้ production + Verify ผ่าน
- [ ] LINE OA Manager → **Bot mode** (ปิด chat)
- [ ] `LINE_USER_CHAT_ENABLED` ไม่ตั้งหรือ `false`
- [ ] Supabase migrations applied บน remote
- [ ] Edge functions deployed + cron vault secrets ตั้งแล้ว

---

*Next: T27 E2E Test*
