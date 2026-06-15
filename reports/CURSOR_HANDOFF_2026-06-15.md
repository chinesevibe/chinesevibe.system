# Cursor Handoff — LINE OA i18n (2026-06-15)

> **Orchestrator:** Cursor  
> **Production:** https://hr-app-two-iota.vercel.app  
> **Branch:** `cursor/p1-04-extract-prd-components`  
> **Supabase prod:** `oouswalwqhojpzqwwdvs` (ไม่ใช่ `cpyuibcrpfslgcazozid`)

---

## สรุปงานที่ Cursor ทำแล้ว (session นี้)

### 1. ภาษา LINE OA + LIFF (ครบ flow พนักงาน)

| หัวข้อ | สถานะ | Commit |
|--------|--------|--------|
| Slash commands `/th` `/en` `/zh` `/ch` `/my` + บันทึก `preferred_locale` | ✅ | `2910d3c` |
| Flex cards ทุกเมนู (leave/OT/doc/complaint/stock/inventory/contact/announcement) | ✅ | `3a08fb1` |
| LIFF forms + `LiffLocaleShell` + `?lang=` fallback | ✅ | `3a08fb1` |
| Flex หลัง submit / HR approve (leave, OT, doc, complaint) | ✅ | `a941177` |
| LIFF checkin, attendance, inbound scan | ✅ | `a941177` |
| Portal inbound + decision API routes ส่ง locale | ✅ | `a941177` |
| **Catalog จีนเต็ม** `zh-employee.ts` (560 keys) | ✅ | `73ca158` |
| Fallback chain: **zh/my → en → th** | ✅ | `73ca158` |
| LIFF client errors ใช้ i18n (`liff.client.*`) | ✅ | `73ca158` |
| Deploy production | ✅ | `73ca158` → Vercel prod |

### 2. Admin Dashboard

| หัวข้อ | สถานะ | Commit |
|--------|--------|--------|
| แทน Recruitment Snapshot stub → **Leave Overview** donut | ✅ | `e9cb27c` |

### 3. Portal login/register (session ก่อนหน้า)

| หัวข้อ | Commit |
|--------|--------|
| Login/register ด้วยรหัสพนักงาน + สาขา, dev `000` | `9e9dc5a` |

---

## สถาปัตยกรรม i18n (สำคัญสำหรับ agent ถัดไป)

```
User พิมพ์ /zh
  → setManualLocale() → hr_employees.preferred_locale = 'zh'
  → กด Rich Menu postback
  → buildActionMessages() → resolveLocaleForLineUser()
  → *GuideFlex(..., locale) → t(key, locale)
  → ปุ่มเปิด LIFF → liffUrl('/liff/leave', locale) → ?lang=zh
  → LiffLocaleShell อ่าน ?lang= / cookie / employee.preferred_locale
  → LeaveForm ใช้ useLocale() + tx()
```

**ไฟล์หลัก**

| ไฟล์ | หน้าที่ |
|------|---------|
| `src/lib/i18n/messages.ts` | catalogs th, en, zh, my |
| `src/lib/i18n/zh-employee.ts` | 560 overrides จีน (employee-facing) |
| `src/lib/i18n/translate.ts` | `t()` + locale-aware fallback |
| `src/lib/i18n/employee-locale.ts` | resolve/set locale จาก LINE user |
| `src/lib/i18n/liff-url.ts` | append `?lang=` |
| `src/lib/i18n/locale-slash-command.ts` | `/zh`, `/en`, … |
| `src/features/liff/LiffLocaleShell.tsx` | LocaleProvider สำหรับ LIFF |
| `src/lib/line/flex/menu-guide.ts` | Flex guides ทุกเมนู |
| `src/lib/line/handlers/actions/*.ts` | ส่ง `ctx.locale` |

---

## สิ่งที่ยังไม่ครบ (backlog ส่งต่อ)

### P0 — User ยังเห็นไม่ครบจีน

| รายการ | เหตุผล | Agent แนะนำ |
|--------|--------|-------------|
| **Rich Menu ปุ่มล่างยังไทยเสมอ** | label static ใน LINE Console / `rich-menu.ts` | **Claude Code** (LINE API link/swap menu) |
| UAT sign-off `/zh` ทุกปุ่ม | ยังไม่มี checklist บันทึกผล | Codex (doc) + QA manual |

### P1 — ภาษาอื่น

| รายการ | Agent แนะนำ |
|--------|-------------|
| **`my-employee.ts`** — catalog พม่าเต็ม (mirror `zh-employee.ts`) | **Codex** |
| HR/admin LINE notify (registration, branch manager) ยัง hardcode ไทย | Claude Code |

### P2 — เอกสาร

| รายการ | Agent แนะนำ |
|--------|-------------|
| อัปเดต `LINE_OA_Employee_Manual_TH.pdf` + เพิ่ม ZH/EN | Codex (script + markdown source) |
| อัปเดต `LINE_OA_WORK_LOG.md` (deploy ล่าสุด + i18n section) | Codex |

### Out of scope (อย่าแตะ)

- Payroll baht / payslip PDF (M39 locked)
- Rich Menu redesign ภาพใหม่ (ไม่จำเป็นถ้า swap label ได้)

---

## Quality gates (ทุก task)

```bash
cd hr-app
npm run build
npm run typecheck
npm run lint   # 0 errors
```

Deploy (Cursor เท่านั้น หลัง review APPROVE):

```bash
git push origin cursor/p1-04-extract-prd-components
cd hr-app && npx vercel --prod --yes
```

---

## Test `/zh` (copy ให้ QA)

1. LINE OA private chat → `/zh` → ข้อความยืนยันภาษาจีน
2. เช็คอิน → picker + guide + share location → จีน
3. ขอลา → card จีน → ฟอร์ม LIFF จีน → submit → card ยืนยันจีน
4. OT / เอกสาร / ร้องเรียน / ติดต่อ HR / สต็อก / รับเข้า — ทำซ้ำ
5. HR อนุมัติ leave → card ผลลัพธ์ที่ employee ได้รับเป็นจีน

**Known limitation:** ปุ่ม Rich Menu ด้านล่าง (เช็คอิน, ขอลา, …) ยังเป็นภาษาไทย — ต้องทำ task แยก (T152)

---

## Git ล่าสุด

```
73ca158 Complete Simplified Chinese i18n for LINE and LIFF flows.
e9cb27c Add leave overview dashboard donut.
a941177 Localize UI text: LINE flex cards, LIFF forms, portal inbound, dashboard, and decision routes.
3a08fb1 Localize LINE OA menu flex cards and LIFF forms by locale.
2910d3c Add LINE OA language slash commands and translate check-in flex cards.
```

---

## Orchestration files

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `orchestration/CURRENT_TASK.md` | งาน active สำหรับ agent ถัดไป |
| `hr-app/_agent/CODEX_PROMPT.md` | copy-paste ส่ง Codex |
| `orchestration/CODEX_DISPATCH.md` | template ทั่วไป |
| `PROJECTS/hr-payroll-client/GROUND_TRUTH.md` | scope + forbidden |
