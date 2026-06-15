# Employee Web Portal v2 + Cleanup — Roadmap (LOCKED)

**Project:** hr-app (`/portal`)  
**Client decision:** 2026-06-12 — **ทำ M40 แล้ว M42 ก่อน M41**  
**M41 Workforce lite:** ❌ **ไม่ต้องการตอนนี้** (cancelled)  
**Last updated:** 2026-06-12

---

## Queue order (HR post-v1.0)

```
T109 (Nav) — in progress
  → T121–T124  M40 Portal v2
  → T129       M42 Cleanup / handoff
  → (skip)     M41 T125–T128 cancelled
```

Inventory (M43) และ M38 sign-off ทำคู่ขนานได้ — ไม่ block M40

---

## Current state (production)

| Item | Today |
|------|--------|
| `canAccessEmployeePortal()` | **`dev` only** — `roles.ts` |
| `/employee` | ข้อความ "ใช้ LINE OA เท่านั้น" |
| `/portal/*` | dashboard, leave, attendance, docs, schedule, **inbound (คลังสินค้า)**; ประกาศ via home widget + `/portal/announcements` (ไม่มี nav) |
| LINE Rich Menu | ปุ่ม「คลังสินค้า」แทน「ประกาศ」 — ประกาศ HR push จาก `/admin/announcements` |
| Login redirect | `employee` → `/employee` ไม่ใช่ `/portal` |

---

## M40 — Portal v2 (T121–T124)

**Goal:** พนักงาน `role=employee` (active) เข้า `/portal` ได้จริง — คู่กับ LINE OA ไม่แทนที่

### T121 — Scope & UX spec

| Item | Detail |
|------|--------|
| Decision | ✅ Client ต้องการ web portal สำหรับพนักงาน |
| Pages in v1 | `/portal` home, profile, attendance, leave, documents, announcements |
| Out of scope | `/portal/schedule` ถ้ายัง stub — ชี้ LIFF หรือ ComingSoon |
| Auth | LINE Login session เดิม; inactive → `/register/pending` |
| Spec output | อัปเดต section ใน `CLIENT_HANDOFF_FINAL.md` (portal enabled) |

### T122 — Enable employee portal auth

| Item | Detail |
|------|--------|
| `canAccessEmployeePortal` | `employee` + `dev` (active only via layout) |
| `adminLoginPath` | active `employee` → `/portal` (ไม่ใช่ `/employee`) |
| `/employee` | redirect active employee → `/portal`; เก็บข้อความ LINE-only สำหรับ edge cases ถ้าจำเป็น |
| Middleware / layout | ตรวจ inactive, pending registration |
| Security | `10-security-review` — employee ไม่เห็น admin routes |

### T123 — Widget data + LIFF deep links

| Item | Detail |
|------|--------|
| Portal home | attendance today, leave balance, announcements (มีแล้ว — verify prod data) |
| Actions | ปุ่ม "ยื่นใน LINE" → LIFF URLs (leave, checkin, OT, documents) |
| Schedule page | stub หรือ link ไป LIFF — ไม่เปิด M41 workforce |

### T124 — Mobile QA + handoff

| Item | Detail |
|------|--------|
| QA | iPhone/Android viewport smoke ทุก `/portal/*` route |
| Docs | `CLIENT_HANDOFF_FINAL.md`, `GROUND_TRUTH.md` — dual channel LINE + portal |
| E2E | optional script `flow-portal-employee.mjs` |

**Acceptance M40:** active employee login → lands `/portal`; ไม่เข้า `/admin`; build+lint pass

---

## M42 — De-scope cleanup (T129)

**Goal:** ลบความขัดแย้งใน docs/nav หลังเปิด portal — **ไม่ลบ `/portal`**

| Item | Detail |
|------|--------|
| Docs | ลบข้อความ "LINE-only permanent" / "ไม่มี web dashboard" ที่ outdated |
| Nav | ลบ stub links ที่ซ้ำซ้อน (ถ้ามี); ยืนยัน admin ไม่โชว์ workforce modules ที่ซ่อนแล้ว |
| `/employee` | redirect-only หรือ merge กับ portal entry |
| Handoff | § worker access = LINE **+** Portal |

**Depends:** T124 (M40 done)

**Acceptance M42:** docs สอดคล้อง production; ไม่มีหน้า stub ที่ misleading

---

## M41 — Workforce lite ❌ CANCELLED

| ID | Title | Status |
|----|-------|--------|
| T125 | Schedule / Shifts (real module) | cancelled |
| T126 | Recruitment lite | cancelled |
| T127 | Training lite | cancelled |
| T128 | Performance lite | cancelled |

เหตุผล: ลูกค้าไม่ต้องการตอนนี้ — lite stubs ที่มีอยู่คงไว้หรือซ่อนใน admin (ไม่ขยาย)

---

## Taskmaster ↔ Linear

| ID | Milestone | Title |
|----|-----------|-------|
| T121 | M40 | Portal v2 — UX spec & scope |
| T122 | M40 | Portal v2 — Enable employee auth |
| T123 | M40 | Portal v2 — Widgets + LIFF links |
| T124 | M40 | Portal v2 — Mobile QA + handoff |
| T125–T128 | M41 | Workforce lite | cancelled |
| T129 | M42 | De-scope cleanup + docs |

Sync: `node orchestration/scripts/linear-sync-hr-payroll.mjs`

---

*Locked by client directive — 2026-06-12*
