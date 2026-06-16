# CNV WorkHub — บันทึกความคืบหน้างาน (Work Log)

> **อัปเดตล่าสุด:** 2026-06-16 (session ค่ำ)  
> **Production:** https://hr-app-two-iota.vercel.app  
> **Supabase:** `oouswalwqhojpzqwwdvs` (Singapore)  
> **Product name:** CNV WorkHub  
> **Deploy ล่าสุด:** `7ed00ad` → `dpl_7FX2MHdWUiUf3hBVdY39DFWy1hZd` (2026-06-16)

ใช้ไฟล์นี้เป็น **เตือนความจำ** — ทำอะไรไปแล้ว อยู่ตรงไหน ยังค้างอะไร

---

## สถานะโดยรวม

| หัวข้อ | สถานะ |
|--------|--------|
| CNV WorkHub core (Rich Menu, LIFF, webhook) | ✅ Deploy แล้ว |
| Portal พนักงาน v2 (shortcuts, widgets) | ✅ Deploy แล้ว |
| Slash commands | ✅ Deploy แล้ว |
| Inventory `/stock` + schema | ✅ Deploy แล้ว (`2a5e06a`) |
| Approval policy ใหม่ (instant attendance, HR-only leave/OT) | ✅ Deploy + migration แล้ว (`c09f486`) |
| คู่มือ PDF พนักงาน (ภาษาไทย) | ✅ มีที่ `reports/LINE_OA_Employee_Manual_TH.pdf` |
| UAT บน LINE production จริง | ⏳ ยังไม่ sign-off |
| Payroll บาท / payslip PDF | 🔒 Out of scope (M39) |
| HR อนุมัติผ่าน LINE OA (ทุกประเภทคำขอ) | ✅ Deploy แล้ว (`bef4e97`) |
| Filter สาขา `/admin/employees` | ✅ Deploy แล้ว (`7ed00ad`) |
| Admin real-time notifications + เสียงแจ้งเตือน | ✅ Deploy แล้ว (`7ed00ad`) |
| Activity log กลาง (`hr_activity_events`) | ⏳ ยังไม่ทำ |

---

## Timeline — ทำอะไรไปบ้าง

### 2026-06-16 — HR อนุมัติผ่าน LINE OA (Phase 0–7)
- **Commit `bef4e97`** — push + deploy production (`dpl_EaiFBDsGvJMf1mDNvtGnk9iRH6h4`)
- **Migration applied:** `20260616190000_hr_line_pending_actions.sql` (`supabase db push --include-all`)
  - ตาราง `hr_line_pending_actions` — เก็บคิว reject แบบสองขั้น (TTL 15 นาที)
- **Shared approval core** (`src/lib/approval/`):
  - `leave.ts`, `overtime.ts`, `document.ts`, `attendance-location-decide.ts`, `complaint-reply.ts`
- **LINE approval infrastructure** (`src/lib/line/approval/`):
  - `approver.ts` — ตรวจสิทธิ์ HR / canManageHr
  - `pending-actions.ts` — สร้าง/ดึง/ลบ pending action
  - `flex-buttons.ts` — ปุ่ม postback อนุมัติ/ปฏิเสธใน Flex
- **Handlers:**
  - `approval-postback.ts` — รับ postback อนุมัติ/ปฏิเสธจาก Flex
  - `pending-action-text.ts` — รับเหตุผลปฏิเสธทางข้อความ 1:1 OA
  - `actions/pending-queue.ts` — คิวรออนุมัติรวม
- **Flex cards:** attendance location review + HR notify cards พร้อมปุ่ม approve/reject
- **Two-step reject:** กดปฏิเสธใน Flex → ระบบถามเหตุผล → HR พิมพ์ในแชท 1:1 OA (≥3 ตัวอักษร)
- **Slash / postback:** `/pending` + `pending_queue` — แสดง Flex คิวรออนุมัติรวม
- **Registration notify:** แจ้ง HR ทุกเคส `inactive` รวม `portal_` prefix
- **สิทธิ์:**
  - ลา / OT → role `hr` เท่านั้น (manager step ยังอยู่บน Web)
  - ลงทะเบียน / เอกสาร / ร้องเรียน / พิกัดเข้างาน → `canManageHr` (hr, dev)
- **i18n:** keys ใหม่ใน `messages.ts`

### 2026-06-16 — Admin: filter สาขา + แจ้งเตือน real-time + เสียง
- **Commit `7ed00ad`** — push + deploy production (`dpl_7FX2MHdWUiUf3hBVdY39DFWy1hZd`)
- **Filter สาขา** `/admin/employees`:
  - dropdown: ทุกสาขา / รอกำหนดสาขา / แต่ละสาขา
  - URL: `?branch_id=<uuid>` หรือ `?branch_id=__none__`
  - ไฟล์: `features/employees/data.ts`, `EmployeeFilters.tsx`, `admin/employees/page.tsx`
- **Real-time admin notifications** (polling 30 วินาที):
  - `AdminNotificationProvider.tsx` — poll `/api/notifications`, อัปเดต bell + sidebar/mobile nav badges
  - แก้: `admin/layout.tsx`, `AdminNotificationBell.tsx`, `AdminHeader.tsx`, `AdminSidebar.tsx`, `AdminMobileNav.tsx`, `AdminShell.tsx`
- **เสียงแจ้งเตือน:**
  - `lib/notifications/play-notification-sound.ts` — Web Audio API beep (ไม่ต้องมีไฟล์เสียง)
  - เล่นเมื่อ `approvalTotal` เพิ่มขึ้น (ไม่เล่นตอนโหลดครั้งแรก)
  - ปิด/เปิดได้ใน dropdown bell → จำใน `localStorage` (`admin-notification-sound-muted`)

### 2026-06-16 (ก่อนหน้า) — LINE auto-link + คอลัมน์ LINE User ID
- **Commit `5f8b594`**
  - Auto-link LINE เมื่อ register / แชท OA
  - คอลัมน์ LINE User ID ใน `/admin/employees`

### 2026-06-11 — Phase 5 handoff baseline
- Rich Menu, LIFF leave/documents/complaint, onboarding register
- Two-tier approval (BM → HR) สำหรับ leave/OT/attendance submit
- เอกสาร: `CLIENT_HANDOFF_P5.md`, `CLIENT_HANDOFF_FINAL.md`

### 2026-06-27 — Inventory + `/stock`
- **Commit `2a5e06a`**
- Migration: `20260627100000_inv_stock_count_transfer.sql`
- Portal `/portal/stock`, handler `check-stock.ts`
- Vercel env: `LINE_STOCK_COMMAND_ENABLED=true`

### 2026-06-27 — CNV WorkHub handoff polish
- **Commit `b099410`**
- Welcome/menu copy v3 (`menu-guide.ts`)
- Slash: `/leave` `/ot` `/doc` `/complaint` `/announce` `/stock` `/inbound`
- Portal nav + complaint/stock shortcuts
- Login page copy "CNV WorkHub และ Portal พนักงาน"

### 2026-06-15 — CNV WorkHub employee i18n rollout
- **Commits `2910d3c` → `73ca158`** และ deploy production วันที่ 2026-06-15
- Slash locale commands: `/th` `/en` `/zh` `/ch` `/my` + บันทึก `preferred_locale`
- Flex cards พนักงานทุกเมนู + LIFF forms + post-submit cards ส่ง locale ครบ flow
- `zh-employee.ts` ครบ 560 keys สำหรับพนักงาน และ fallback chain `zh/my → en → th`
- Known backlog ตอน handoff: Rich Menu locale labels (T152), Burmese employee catalog full coverage (ปิดใน T151)

### 2026-06-29 — หลายภาษา (i18n)
- **Portal:** เลือกภาษา ไทย / English / 中文 / မြန်မာ ที่ header → บันทึก `hr_employees.preferred_locale` + cookie
- **CNV WorkHub (LINE):** ข้อความหลัก (welcome, check-in/out, geofence, submit, errors) แสดงตาม `preferred_locale` ของพนักงาน
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
- [x] **อนุมัติผ่าน LINE OA** — ลา, OT, เอกสาร, ร้องเรียน, พิกัดเข้างาน, ลงทะเบียน (`bef4e97`)
- [x] `/pending` + postback `pending_queue` — คิวรออนุมัติรวมใน LINE
- [x] Filter สาขาใน `/admin/employees` (`7ed00ad`)
- [x] Admin notification bell + sidebar badges อัปเดตอัตโนมัติทุก 30 วินาที (`7ed00ad`)
- [x] เสียงแจ้งเตือนเมื่อมีคำขอรออนุมัติเพิ่ม (`7ed00ad`)

### เอกสาร / handoff
- [x] Employee manual PDF (16 หน้า, รูปจริง)
- [ ] `CLIENT_HANDOFF_FINAL.md` — **ยังเขียน OT แบบ BM→HR** ต้อง sync

---

## Commits สำคัญ (CNV WorkHub)

| Commit | สรุป |
|--------|------|
| `7ed00ad` | Branch filter employees + live admin notifications + sound |
| `bef4e97` | HR approvals through LINE OA (all request types) |
| `5f8b594` | Auto-link LINE on register/chat; LINE User ID column in admin |
| `73ca158` | Complete Simplified Chinese employee i18n + zh/my fallback chain |
| `a941177` | Localize LINE flex results, LIFF checkin, portal inbound, decision routes |
| `3a08fb1` | Localize CNV WorkHub menu flex cards and LIFF forms by locale |
| `2910d3c` | Add CNV WorkHub language slash commands and locale persistence |
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
| 2 | **UAT HR approve ผ่าน LINE** | อนุมัติ/ปฏิเสธ+เหตุผล, `/pending`, ลงทะเบียน portal |
| 3 | **ยืนยัน `HR_LINE_GROUP_ID`** | runtime config production ถูกต้อง |
| 4 | **Sync handoff docs** | แก้ `CLIENT_HANDOFF_FINAL.md` + `GROUND_TRUTH.md` OT rule |
| 5 | **Geofence สาขา** | ตั้ง lat/lng 001–003 ใน Admin |
| 6 | **Cron health** | `node scripts/cron-health-check.mjs` + approval-expiry |

### กลาง — โครงการ HR รวม
| # | งาน | Task ref |
|---|-----|----------|
| 7 | **Activity log กลาง** (`hr_activity_events`) | ยังไม่ implement — audit trail รวม |
| 8 | Payroll Policy v1 + UAT เปรียบ Excel | payroll-uat |
| 9 | Inventory UAT E2E | inbound → requisition → issue |
| 10 | Inventory Phase: Stock count (T141–T142) | inv-stock-count |
| 11 | Inventory Phase: Branch transfer (T143) | inv-transfer |
| 12 | M38 sign-off: E2E + security + tag v1.1 | m38-closeout |
| 13 | Embed Noto Sans Thai ใน payslip PDF | pdf-thai |

### ต่ำ / locked
| # | งาน | หมายเหตุ |
|---|-----|----------|
| 11 | Rich Menu locale labels per language | T152 — LINE Console / rich-menu swap |
| 12 | Payroll baht calculation | M39 — ต้อง CR ลงนาม |
| 13 | Odoo integration cleanup | แยก scope |

### งานค้างจาก session อื่น (ไม่ใช่ CNV WorkHub โดยตรง)
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
[ ] HR กดอนุมัติลาใน Flex LINE → พนักงานได้แจ้งผล
[ ] HR กดปฏิเสธ → พิมพ์เหตุผลในแชท 1:1 OA → สำเร็จ
[ ] /pending — แสดงคิวรออนุมัติรวม
[ ] Admin bell — badge อัปเดตภายใน ~30 วินาทีเมื่อมีคำขอใหม่
[ ] Admin bell — เสียงแจ้งเตือนเมื่อ approval เพิ่ม (ปิด/เปิดได้)
[ ] /admin/employees — filter สาขา + รอกำหนดสาขา
```

---

## ไฟล์อ้างอิง (session 2026-06-16)

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `src/lib/approval/*.ts` | shared decide logic (Web + LINE) |
| `src/lib/line/approval/*.ts` | LINE approver + pending actions |
| `src/lib/line/handlers/approval-postback.ts` | postback อนุมัติ/ปฏิเสธ |
| `src/lib/line/handlers/pending-action-text.ts` | รับเหตุผลปฏิเสธทางข้อความ |
| `src/lib/line/actions/pending-queue.ts` | `/pending` คิวรวม |
| `supabase/migrations/20260616190000_hr_line_pending_actions.sql` | pending reject table |
| `src/components/admin/AdminNotificationProvider.tsx` | poll notifications + sound |
| `src/lib/notifications/play-notification-sound.ts` | Web Audio beep |
| `src/features/employees/data.ts` | `getBranchesForFilter`, branch_id filter |

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

*อัปเดตล่าสุด: Cursor session 2026-06-16 — HR LINE approval + admin notifications deploy*
