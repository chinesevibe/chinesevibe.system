# LINE OA — บันทึกความคืบหน้างาน (Work Log)

> **อัปเดตล่าสุด:** 2026-06-28  
> **Production:** https://hr-app-two-iota.vercel.app  
> **Supabase:** `oouswalwqhojpzqwwdvs` (Singapore)  
> **Deploy ล่าสุด:** commit `c09f486` — `npx vercel --prod --yes`

ใช้ไฟล์นี้เป็น **เตือนความจำ** — ทำอะไรไปแล้ว อยู่ตรงไหน ยังค้างอะไร

---

## สถานะโดยรวม

| หัวข้อ | สถานะ |
|--------|--------|
| LINE OA core (Rich Menu, LIFF, webhook) | ✅ Deploy แล้ว |
| Portal พนักงาน v2 (shortcuts, widgets) | ✅ Deploy แล้ว |
| Slash commands | ✅ Deploy แล้ว |
| Inventory `/stock` + schema | ✅ Deploy แล้ว (`2a5e06a`) |
| Approval policy ใหม่ (instant attendance, HR-only leave/OT) | ✅ Deploy + migration แล้ว (`c09f486`) |
| คู่มือ PDF พนักงาน (ภาษาไทย) | ✅ มีที่ `reports/LINE_OA_Employee_Manual_TH.pdf` |
| UAT บน LINE production จริง | ⏳ ยังไม่ sign-off |
| Payroll บาท / payslip PDF | 🔒 Out of scope (M39) |

---

## Timeline — ทำอะไรไปบ้าง

### 2026-06-11 — Phase 5 handoff baseline
- Rich Menu, LIFF leave/documents/complaint, onboarding register
- Two-tier approval (BM → HR) สำหรับ leave/OT/attendance submit
- เอกสาร: `CLIENT_HANDOFF_P5.md`, `CLIENT_HANDOFF_FINAL.md`

### 2026-06-27 — Inventory + `/stock`
- **Commit `2a5e06a`**
- Migration: `20260627100000_inv_stock_count_transfer.sql`
- Portal `/portal/stock`, handler `check-stock.ts`
- Vercel env: `LINE_STOCK_COMMAND_ENABLED=true`

### 2026-06-27 — LINE OA handoff polish
- **Commit `b099410`**
- Welcome/menu copy v3 (`menu-guide.ts`)
- Slash: `/leave` `/ot` `/doc` `/complaint` `/announce` `/stock` `/inbound`
- Portal nav + complaint/stock shortcuts
- Login page copy "LINE OA และ Portal พนักงาน"

### 2026-06-15 — LINE OA employee i18n rollout
- **Commits `2910d3c` → `73ca158`** และ deploy production วันที่ 2026-06-15
- Slash locale commands: `/th` `/en` `/zh` `/ch` `/my` + บันทึก `preferred_locale`
- Flex cards พนักงานทุกเมนู + LIFF forms + post-submit cards ส่ง locale ครบ flow
- `zh-employee.ts` ครบ 560 keys สำหรับพนักงาน และ fallback chain `zh/my → en → th`
- Known backlog ตอน handoff: Rich Menu locale labels (T152), Burmese employee catalog full coverage (ปิดใน T151)

### 2026-06-29 — หลายภาษา (i18n)
- **Portal:** เลือกภาษา ไทย / English / 中文 / မြန်မာ ที่ header → บันทึก `hr_employees.preferred_locale` + cookie
- **LINE OA:** ข้อความหลัก (welcome, check-in/out, geofence, submit, errors) แสดงตาม `preferred_locale` ของพนักงาน
- **Migration:** `20260629100000_employee_preferred_locale.sql` (applied Supabase)
- **Code:** `src/lib/i18n/` · `POST /api/portal/locale`

- **Commit `c09f486`** (push + deploy production)
- **Policy ใหม่ (ตามคำขอ client):**
  - เช็คอิน/เช็คเอาท์ → **บันทึกทันที** ไม่รออนุมัตi
  - ลา / ลาพักร้อน / OT → **HR อนุมัตiคนเดียว** (ไม่ผ่าน BM)
- **Code หลัก:**
  - `src/lib/attendance/finalize-attendance-record.ts` — auto-approve + `recordPayrollHours`
  - `check-out.ts`, `manual.ts`, `submit-daily.ts` — เรียก finalize หลัง checkout
  - `checkout.ts` flex — ลบปุ่ม "ยื่นสรุปวัน"
  - `submit-attendance.ts`, LIFF, LeaveForm, notifications — copy HR-only
- **Migration applied:** `20260628100000_remove_bm_approval_step.sql`
  - `pending_manager` → `pending_hr` (attendance_submissions, leaves, overtime_requests)
- **PDF:** `scripts/generate-line-oa-employee-manual.py` → `reports/LINE_OA_Employee_Manual_TH.pdf`

---

## สิ่งที่ส่งมอบแล้ว (Feature checklist)

### ช่องทางพนักงาน
- [x] Rich Menu v3 (2×3): เช็คอิน | OT | เอกสาร / ลา | ร้องเรียน | ติดต่อ HR
- [x] Location check-in/out + geofence
- [x] QR check-in จาก Portal profile
- [x] LIFF: leave, overtime, documents, complaint, attendance (manual time)
- [x] Employee Portal `/portal` + shortcuts
- [x] Self-register `/register` → HR approve account
- [x] Slash commands (ทำงานเมื่อปิด free-text chat)

### อนุมัตi / workflow (production ปัจจุบัน)
- [x] Attendance: **instant** — finalize on checkout → payroll hour lines
- [x] Leave: `pending_hr` → HR decide → LINE notify
- [x] OT: `pending_hr` → HR decide → LINE notify
- [x] Documents: HR process (ไม่เปลี่ยน)
- [x] Registration: HR approve → active

### HR / Admin
- [x] `/admin/leaves`, `/admin/overtime`, `/admin/attendance`
- [x] `/admin/announcements` → LINE push
- [x] Branch Manager dashboard ยังมี (ดูทีม/คิว) แต่ **ไม่ใช่ขั้นอนุมัตi** leave/OT/attendance แล้ว

### เอกสาร / handoff
- [x] Employee manual PDF (16 หน้า, รูปจริง)
- [ ] `CLIENT_HANDOFF_FINAL.md` — **ยังเขียน OT แบบ BM→HR** ต้อง sync

---

## Commits สำคัญ (LINE OA)

| Commit | สรุป |
|--------|------|
| `73ca158` | Complete Simplified Chinese employee i18n + zh/my fallback chain |
| `a941177` | Localize LINE flex results, LIFF checkin, portal inbound, decision routes |
| `3a08fb1` | Localize LINE OA menu flex cards and LIFF forms by locale |
| `2910d3c` | Add LINE OA language slash commands and locale persistence |
| `290d8f7` | Rich Menu v3 + slash `/stock` |
| `2a5e06a` | Portal stock + inventory migration |
| `b099410` | Handoff copy, slash commands, portal |
| `c09f486` | Auto attendance + HR-only approval + PDF |

---

## ยังต้องทำ (Reminder / Backlog)

### สูง — ก่อนส่งมอบ client รอบสุดท้าย
| # | งาน | หมายเหตุ |
|---|-----|----------|
| 1 | **UAT LINE production** | เช็คอิน/เอาท์, ลา, OT, slash, ประกาศ — บัญชีพนักงานจริง |
| 2 | **Sync handoff docs** | แก้ `CLIENT_HANDOFF_FINAL.md` + `GROUND_TRUTH.md` OT rule |
| 3 | **Geofence สาขา** | ตั้ง lat/lng 001–003 ใน Admin |
| 4 | **Cron health** | `node scripts/cron-health-check.mjs` + approval-expiry |

### กลาง — โครงการ HR รวม
| # | งาน | Task ref |
|---|-----|----------|
| 5 | Payroll Policy v1 + UAT เปรียบ Excel | payroll-uat |
| 6 | Inventory UAT E2E | inbound → requisition → issue |
| 7 | Inventory Phase: Stock count (T141–T142) | inv-stock-count |
| 8 | Inventory Phase: Branch transfer (T143) | inv-transfer |
| 9 | M38 sign-off: E2E + security + tag v1.1 | m38-closeout |
| 10 | Embed Noto Sans Thai ใน payslip PDF | pdf-thai |

### ต่ำ / locked
| # | งาน | หมายเหตุ |
|---|-----|----------|
| 11 | Rich Menu locale labels per language | T152 — LINE Console / rich-menu swap |
| 12 | Payroll baht calculation | M39 — ต้อง CR ลงนาม |
| 13 | Odoo integration cleanup | แยก scope |

### งานค้างจาก session อื่น (ไม่ใช่ LINE OA โดยตรง)
- **T150** — `default_check_in_time` / `default_check_out_time` backend (UI มีแล้ว, DB/API ยังไม่ครบ) — ดู `orchestration/CURRENT_TASK.md`
- **Inventory hub UI** — compact tiles (`InventoryHub.tsx`) อาจยัง uncommitted

---

## UAT checklist (copy ไปใช้ทดสอบ)

```
[ ] เช็คอิน — แชร์ location ในสาขา → ได้เวลาเข้า ไม่มีข้อความรออนุมัตi
[ ] เช็คเอาท์ — Flex สรุปชั่วโมง ไม่มีปุ่ม "ยื่นสรุปวัน"
[ ] Admin attendance — มี submission approved + payroll hour line
[ ] ขอลา LIFF — สถานะ "รอ HR อนุมัตi"
[ ] HR approve leave — พนักงานได้ LINE แจ้งผล
[ ] ขอ OT — เหมือนลา
[ ] /leave /ot ในแชท — เปิด LIFF ได้
[ ] /stock — ทำงานเมื่อ LINE_STOCK_COMMAND_ENABLED=true
[ ] Portal /portal — แสดงสถานะวันนี้ + ทางลัด LIFF
[ ] ลงทะเบียนใหม่ → HR approve → ใช้ Rich Menu ได้
```

---

## ไฟล์อ้างอิง

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `reports/LINE_OA_Employee_Manual_TH.pdf` | ส่งให้พนักงาน |
| `scripts/generate-line-oa-employee-manual.py` | regenerate PDF |
| `reports/CLIENT_HANDOFF_FINAL.md` | handoff client (ต้อง sync) |
| `reports/CLIENT_HANDOFF_P5.md` | LINE setup detail |
| `src/lib/line/flex/menu-guide.ts` | welcome / guide copy |
| `src/lib/line/slash-commands.ts` | slash command map |
| `src/lib/attendance/finalize-attendance-record.ts` | auto-record logic |
| `supabase/migrations/20260628100000_remove_bm_approval_step.sql` | BM→HR migration |

---

## คำสั่งที่ใช้บ่อย

```bash
# Deploy
cd hr-app && npx vercel --prod --yes

# Quality gates
npm run build && npm run typecheck && npm run lint

# Regenerate PDF manual
python3 scripts/generate-line-oa-employee-manual.py
cp output/pdf/LINE_OA_Employee_Manual_TH.pdf reports/

# Smoke
node scripts/e2e/smoke-role-routes.mjs
node scripts/cron-health-check.mjs
```

---

*เขียนโดย Cursor session 2026-06-28 — อัปเดตไฟล์นี้ทุกครั้งที่ปิดงาน LINE OA สำคัญ*
