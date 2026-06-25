# Supabase Migration Checklist

**จาก:** `oouswalwqhojpzqwwdvs` (prod ปัจจุบัน)  
**ไป:** `cpyuibcrpfslgcazozid` (เป้าหมาย)  
**แอป:** https://hr-app-rho-blush.vercel.app

> บันทึก: CLI ในเครื่องนี้ login org `tlhyrwhqlqkajlawrkel` — เห็นแค่ `oouswal...` + `myqthx...`  
> **ไม่เห็น** `cpyuib...` → ต้อง login Supabase ด้วยบัญชีที่เป็น owner ของ project เป้าหมายก่อนรัน cleanup/restore

---

## Phase 0 — ก่อนเริ่ม

- [ ] ยืนยัน project เป้าหมาย `cpyuibcrpfslgcazozid` เปิดอยู่และ region ต้องการ (แนะนำใกล้ SG/TH)
- [ ] เก็บ **Database password** ทั้งเก่าและใหม่ (Dashboard → Settings → Database)
- [ ] เก็บ **API keys** ใหม่ (Settings → API): anon + service_role
- [ ] **อย่าลบ** project เก่าจนกว่า UAT ผ่าน 2–3 วัน
- [ ] แจ้งทีม: หลังย้ายทุกคนต้อง login ใหม่ (auth ไม่ได้ dump มา)

---

## Phase 1 — เคลียร์ project เป้าหมาย (`cpyuib...`)

เลือกอย่างใดอย่างหนึ่ง:

### วิธี A — SQL Editor (ไม่ต้อง CLI)

1. เปิด https://supabase.com/dashboard/project/cpyuibcrpfslgcazozid/sql/new
2. วางเนื้อหาจาก `scripts/supabase/cleanup-target-public.sql`
3. Run → ตรวจ `public_tables` ควรเป็น 0 แถว (หรือเหลือแค่ตารางว่าง)

### วิธี B — Terminal

```bash
cd hr-app
export SUPABASE_DB_PASSWORD='...'   # รหัสของ cpyuib...
chmod +x scripts/supabase/cleanup-target.sh
./scripts/supabase/cleanup-target.sh cpyuibcrpfslgcazozid
```

### ถ้าต้องการล้าง schema ทั้งก้อน (ก่อน `pg_restore` เต็ม)

ใน SQL Editor ใช้ block **B** ใน `cleanup-target-public.sql` (DROP SCHEMA public) แทน block A

- [ ] เคลียร์ public data/schema บน `cpyuib...` แล้ว
- [ ] (ถ้าต้องการ) ลบ `storage.objects` + copy ไฟล์ข้าม project ทีหลัง

---

## Phase 2 — Dump จาก project เก่า

```bash
pg_dump \
  --dbname="postgresql://postgres:[PASSWORD_เก่า]@db.oouswalwqhojpzqwwdvs.supabase.co:5432/postgres" \
  --format=custom \
  --no-owner \
  --exclude-schema=extensions \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=graphql_public \
  --exclude-schema=pgbouncer \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=vault \
  --file=hr-payroll-backup.dump
```

- [ ] ได้ไฟล์ `hr-payroll-backup.dump` และเก็บ backup ไว้ปลอดภัย
- [ ] บันทึกขนาดไฟล์ + วันที่ dump

**ทางเลือก (sync กับ repo):** `supabase db push` บนเป้าหมายแล้ว dump เฉพาะ data จาก `public` แทน full schema

---

## Phase 3 — Restore ไป project ใหม่

```bash
pg_restore \
  --dbname="postgresql://postgres:[PASSWORD_ใหม่]@db.cpyuibcrpfslgcazozid.supabase.co:5432/postgres" \
  --format=custom \
  --no-owner \
  --verbose \
  hr-payroll-backup.dump
```

- [ ] restore เสร็จ (warning บางอันยอมได้ — ดู error ที่เป็น FATAL)
- [ ] ตรวจตัวอย่าง: `hr_employees`, `hr_branches`, `hr_attendance`, `inv_skus`

```sql
SELECT count(*) FROM hr_employees;
SELECT count(*) FROM hr_attendance;
SELECT count(*) FROM hr_leaves;
SELECT count(*) FROM hr_overtime_requests;
```

---

## Phase 4 — ตั้งค่า Dashboard project ใหม่

### Auth

- [ ] Site URL = `https://hr-app-rho-blush.vercel.app`
- [ ] Redirect URLs รวม `https://hr-app-rho-blush.vercel.app/api/auth/line/callback`
- [ ] LINE Login provider (Client ID / Secret จาก LINE Developers)

### Storage

- [ ] buckets: avatars, contracts, leave-attachments, hr-announcements ฯลฯ (ตาม migration)
- [ ] CORS ถ้าอัปโหลดจาก browser
- [ ] copy ไฟล์จาก project เก่า (ถ้าต้องการรูป/เอกสารเดิม)

### Edge Functions + Cron

Deploy จาก `hr-app/`:

```bash
npx supabase link --project-ref cpyuibcrpfslgcazozid
npx supabase functions deploy morning-push
npx supabase functions deploy evening-summary
npx supabase functions deploy weekly-summary
npx supabase functions deploy monthly-summary
npx supabase functions deploy visa-alert
npx supabase functions deploy probation-alert
npx supabase functions deploy contract-alert
npx supabase functions deploy approval-expiry
npx supabase functions deploy announcement-scheduler
```

- [ ] functions deploy ครบ
- [ ] Cron schedules + secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, LINE tokens)

### Apply GRANT block before cutover

- [x] Apply `supabase/migrations/20260618120000_restore_supabase_api_grants.sql` on `cpyuibcrpfslgcazozid`
- [x] Verify `hr_branches` grants for `anon`, `authenticated`, `service_role`
- [x] Verify row counts: `hr_employees = 45`, `hr_branches = 4`, `hr_attendance = 16`
- [x] Verify `attendance_go_live_date = 2026-06-18` in `hr_runtime_config`
- [ ] Smoke `GET /api/auth/register/branches` against `cpyuib...` and confirm no `permission denied`
- [ ] Do not continue to Phase 5 cutover until every GRANT check above passes

---

## Phase 5 — Environment + Deploy

### Vercel (Production)

| Variable | เปลี่ยนเป็น |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cpyuibcrpfslgcazozid.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | คีย์ใหม่ |
| `SUPABASE_SERVICE_ROLE_KEY` | คีย์ใหม่ |

**ไม่ต้องเปลี่ยน** (ยกเว้นมีค่าใหม่): `LINE_*`, `NEXT_PUBLIC_BASE_URL`, `ODOO_*`, `HR_LINE_GROUP_ID`

### Local

- [ ] อัปเดต `hr-app/.env.local` ให้ตรงกับ project ใหม่
- [ ] **อย่า commit** `.env.local`

```bash
cd hr-app && npx vercel --prod --yes
```

- [ ] deploy production แล้ว

---

## Phase 6 — Smoke test (UAT)

### Login / Auth

- [ ] Portal: รหัส `000` + สาขา **Head Office (code `000`)** → เข้า `/admin`
- [ ] LINE login → callback สำเร็จ
- [ ] Officer password flow (ถ้ามีแผนก Officer)

### HR core

- [ ] รายชื่อพนักงาน / โปรไฟล์โหลดได้
- [ ] Attendance มีข้อมูลเดิม (หรือตามที่ dump มา)
- [ ] ใบลา / OT — ดูรายการ + อนุมัติได้
- [ ] แจ้งเตือน LINE (ถ้าเปิด)

### Inventory

- [ ] `/admin/inventory` โหลดได้
- [ ] SKU / stock / inbound ตัวอย่าง 1 flow

### Storage (ถ้าไม่ได้ migrate)

- [ ] ทราบว่ารูป avatar / เอกสารเก่าอาจ 404 จนกว่าจะ copy storage

---

## Phase 7 — หลัง UAT ผ่าน

- [ ] อัปเดตเอกสาร handoff (`CLIENT_HANDOFF_P5.md`, `LINE_OA_WORK_LOG.md`) ให้ชี้ project ref ใหม่
- [ ] พักหรือลบ project เก่า `oouswal...` (หลัง backup แน่นอน)
- [ ] อัปเดต `supabase link` ในเครื่อง dev ให้ชี้ `cpyuib...`

---

## ไฟล์ช่วยใน repo

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| `scripts/supabase/cleanup-target-public.sql` | เคลียร์ data บน project เป้าหมาย |
| `scripts/supabase/cleanup-target.sh` | รัน cleanup ผ่าน psql |
| `supabase/migrations/*.sql` | schema อ้างอิง / `db push` |
| `reports/CURSOR_HANDOFF_2026-06-15.md` | บันทึกว่า prod เดิมคือ `oouswal...` |

---

## Blocker ปัจจุบัน (เครื่อง dev)

- `supabase link --project-ref cpyuibcrpfslgcazozid` → **no privileges** (บัญชี CLI คนละ org กับ project เป้าหมาย)
- **แก้:** login Supabase CLI ด้วยเมล owner ของ `cpyuib...` หรือรัน cleanup ผ่าน Dashboard SQL Editor
