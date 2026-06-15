# Sitemap & Grouped Nav — Implementation Plan (LOCKED)

**Project:** hr-app  
**Status:** Ready to implement  
**Last updated:** 2026-06-12

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| `/admin/ceo` | **301 redirect → `/admin/report`** (ทับ route เดิม — ไม่เก็บ Executive Dashboard แยก) |
| `/admin/reports` | **301 redirect → `/admin/report`** |
| `/admin/report` | ใช้เนื้อหา **ReportsPanel** จาก `reports/page.tsx` (ย้าย/ทับ) |
| CEO login landing | `adminLoginPath(ceo)` → **`/admin/report`** |
| Department nav | **เปิดเมนูครบทุกคน** ที่เข้า admin portal — ยังไม่ filter ตามแผนก |
| Management + `employee` | **เปิด nav ครบเหมือน HR** (ลบ redirect จำกัด `/admin` only) |
| BM portal | ไม่เปลี่ยน — `/admin/branch` แยก |

---

## Target sitemap

```
Human Management
├─ HR Dashboard       → /admin
├─ Employee           → /admin/employees
├─ Approval           → /admin/manager
├─ Attendance         → /admin/attendance
├─ Leave Management   → /admin/leaves
├─ Overtime           → /admin/overtime
├─ Announcements      → /admin/announcements
├─ Complaints         → /admin/complaints
└─ Documents          → /admin/documents

Accounting
└─ Payroll            → /admin/payroll

Management
├─ Organization       → /admin/organization
├─ Branches           → /admin/branches
├─ Report & Analytics → /admin/report
├─ Inventory          → /admin/inventory (placeholder)
└─ Setting            → /admin/settings
```

Branch drill-down (ไม่ใส่ sidebar): `/admin/branch/[slug]` (+ sub-routes)

---

## Tasks

### P1-NAV-01 — Nav types + groups

- [ ] `AdminNavGroup` type in `admin-nav-types.ts`
- [ ] `ADMIN_NAV_GROUPS` ตาม tree ด้านบน
- [ ] Icon สำหรับ Organization, Branches, Inventory

### P1-NAV-02 — Sidebar UI

- [ ] `AdminSidebar` / mobile nav: section headers + indented items
- [ ] Active state + Approval badge
- [ ] ลบ flat `ADMIN_NAV_ITEMS` จาก sidebar

### P1-NAV-03 — Dev view + nav routing

- [ ] `dev-view.ts` ใช้ groups
- [ ] `getNavItemsForRole`: Management `employee` → **full groups** (ลบ `MANAGEMENT_EMPLOYEE_NAV_ITEMS`)
- [ ] CEO ใช้ grouped nav เดียวกับ HR (deprecate `ceo-nav.ts` หรือ map เป็น groups)

### P1-RPT-01 — Report route

- [ ] สร้าง `app/admin/report/page.tsx` — ย้าย logic จาก `reports/page.tsx`
- [ ] `app/admin/reports/page.tsx` → `redirect('/admin/report')`
- [ ] `app/admin/ceo/page.tsx` → `redirect('/admin/report')`
- [ ] อัปเดตลิงก์ภายใน (`HrAdminDashboard`, widgets, ฯลฯ)

### P1-RPT-02 — Auth paths

- [ ] `adminLoginPath(ceo)` → `/admin/report`
- [ ] `CEO_ALLOWED_PREFIXES` — เพิ่ม `/admin/report`, ลบ lock เฉพาะ prefix เก่า (เปิดทั้งหมด)
- [ ] `admin/layout.tsx` — ลบ CEO path prison + **ลบ Management employee redirect** (lines ~64–70)

### P1-INV-01 — Inventory placeholder

- [ ] `app/admin/inventory/page.tsx` — DevelopmentEmptyState

### P1-QA-01 — Verify + deploy

- [ ] build + typecheck + lint
- [ ] Smoke: ทุก nav href, redirects, BM `/admin/branch`, branches drill
- [ ] `vercel --prod`

---

## Files (expected touch)

| Area | Files |
|------|--------|
| Nav | `admin-nav-types.ts`, `admin-nav.ts`, `AdminSidebar.tsx`, `AdminHeader.tsx`, `branch-nav.ts` |
| Routes | `admin/report/page.tsx`, `admin/reports/page.tsx`, `admin/ceo/page.tsx`, `admin/inventory/page.tsx` |
| Auth | `roles.ts`, `admin/layout.tsx` |
| Links | `dev-view.ts`, `HrAdminDashboard.tsx`, `CeoDashboard.tsx` (ถ้ายัง import) |
| Remove/deprecate | `ceo-nav.ts` |

---

## Out of scope

- Department-based menu filtering (ทำทีหลังตามลูกค้า)
- Inventory module จริง
- URL restructure อื่นๆ
- Alerts / Performance / Recruitment / Training ใน sidebar
