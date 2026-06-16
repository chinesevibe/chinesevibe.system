# Inventory Module — Roadmap (LOCKED)

**Project:** hr-app (`/admin/inventory`)  
**Status:** Phase 1 deployed — Phase 2+ planned  
**Last updated:** 2026-06-12  
**PRD refs:** `docs/PRD.md`, `docs/SITEMAP.md` (mobile `/m/inbound`, scan flows)

---

## Scope summary

| Surface | Path | Phase |
|---------|------|-------|
| Web Admin — master data | `/admin/inventory/*` | ✅ Phase 1 |
| Web Admin — stock | `/admin/inventory/stock` | 🔜 Phase 2 |
| Web Admin — inbound | `/admin/inventory/inbound` | 🔜 Phase 4 |
| Mobile / LIFF scan | `/liff/inbound-scan?order=...` | ✅ Phase 4 |
| Portal inbound hub | `/portal/inbound` | ✅ Phase 4.1 (T135) |
| LINE Rich Menu | ปุ่ม「คลังสินค้า」→ `/portal/inbound` | ✅ Phase 4.1 |
| CEO KPIs | `/admin/report` widgets | ✅ Phase 1b |

**DB prefix:** `inv_*` (separate from `hr_branches`)

---

## Phase status

| Phase | Taskmaster | Goal | Status |
|-------|------------|------|--------|
| **1** | T130 | Schema + master CRUD + report KPIs | ✅ DONE (deployed) |
| **1.5** | T131 | UAT fixes, RLS dev, UX polish | ✅ DONE |
| **2** | T132 | Stock visibility (`inv_stock_balances`) | ✅ DONE |
| **3** | T133 | HR ↔ inv branch mapping (optional) | 📋 Backlog (optional) |
| **4** | T134 | Inbound orders + LIFF barcode scan | ✅ DONE |
| **4.1** | T135 | Portal inbound hub + LINE menu swap | ✅ DONE |

**Linear:** `[HRP] T130`–`T135` under project **CNV WorkHub**, milestone **M43 Inventory**

---

## Phase 1 — Master Data ✅ (DONE)

**Commits:** `6f7b990` (schema + CRUD), `51a925b` (report KPI widgets)

### Delivered

- Migration `20260622100000_inventory_schema.sql` applied
- Tables: `inv_units`, `inv_skus`, `inv_suppliers`, `inv_branches`, `inv_warehouses`, `inv_boms`, `inv_stock_balances`, `inv_inbound_*`
- CRUD UI: SKU, suppliers, inv branches, warehouses
- HR/Admin/Dev write; CEO read-only
- `/admin/report` — 3 inventory widgets: สต็อกต่ำ Min, รับเข้ารออนุมัติ, สต็อก = 0

### Acceptance (met)

- [x] `/admin/inventory` hub + sub-nav 200
- [x] CRUD all 4 master entities
- [x] `npm run build && typecheck` pass
- [x] Production deploy

---

## Phase 1.5 — UAT & hardening (T131)

**Agent:** Claude Code  
**Depends:** T130

| Item | Detail |
|------|--------|
| RLS `dev` role | Write policies use `hr_is_hr_admin()` only — verify dev can CRUD in UAT |
| Empty / error UX | Thai validation messages, delete confirm |
| Seed / demo data | 1 branch → 1 warehouse → 5–10 SKUs for demo |
| Smoke | HR full CRUD flow without console errors |

**Gate:** HR completes create branch → warehouse → SKU → supplier without blockers

---

## Phase 2 — Stock visibility (T132)

**Agent:** Claude Code  
**Depends:** T131 (recommended) or T130

### Deliverables

| Item | Detail |
|------|--------|
| Route | `/admin/inventory/stock` |
| Data | `inv_stock_balances` join SKU + warehouse + branch |
| Filters | branch, warehouse, SKU search, below-min toggle |
| CEO | read-only (same as master data) |
| Manual adjust (optional) | HR +/- quantity with audit note — defer if scope tight |

### Acceptance

- [ ] Table shows qty per SKU per warehouse
- [ ] Filter “ต่ำกว่า min” matches report KPI logic
- [ ] CEO sees stock, cannot edit
- [ ] build + typecheck + lint pass

---

## Phase 3 — HR ↔ Inventory branch mapping (T133) — OPTIONAL

**Agent:** Claude Code  
**Priority:** low  
**Depends:** T132

Link `hr_branches` ↔ `inv_branches` (nullable FK or mapping table) so CEO/report can filter stock by HR org branch.

**Skip if:** client uses separate inv branch codes only.

---

## Phase 4 — Inbound + mobile scan (T134)

**Agent:** Claude Code  
**Depends:** T132  
**PRD:** Goods receipt, lot/expiry, barcode scan, photo attach, approve → increase stock

### Web Admin

| Item | Detail |
|------|--------|
| `/admin/inventory/inbound` | List + create inbound order |
| Flow | HR สร้างใบ (pending) → คลังสแกน → HR ตรวจอนุมัติ → `inv_stock_balances` |
| Items | SKU, qty, cost, lot, expiry on `inv_inbound_items` |

### Mobile / LIFF

| Item | Detail |
|------|--------|
| Scan | Barcode → resolve `inv_skus.barcode` |
| Confirm qty | Save line to inbound order |
| Auth | LINE employee session (same as check-in) |

**Out of scope Phase 4:** requisition, stock count, transfer, damage (`/m/*` other routes → later)

---

## Taskmaster ↔ Linear

| ID | Title | Status |
|----|-------|--------|
| T130 | Inventory Phase 1 — Master Data + Report KPIs | done |
| T131 | Inventory Phase 1.5 — UAT & RLS fixes | done |
| T132 | Inventory Phase 2 — Stock visibility | done |
| T133 | Inventory Phase 3 — HR-inv branch mapping (optional) | pending |
| T134 | Inventory Phase 4 — Inbound + LIFF scanner | done |

Sync: `node orchestration/scripts/linear-sync-hr-payroll.mjs`

---

## Files (reference)

| Area | Path |
|------|------|
| Schema | `hr-app/supabase/migrations/20260622100000_inventory_schema.sql` |
| Features | `hr-app/src/features/inventory/*` |
| Report widgets | `hr-app/src/features/inventory/InventoryDashboardWidgets.tsx` |
| Routes | `hr-app/src/app/admin/inventory/**` |

---

## Not in roadmap (future)

- BOM production / recipe deduction
- Requisition, transfer, stock count, damage (PRD mobile routes)
- Accounting integration
- Multi-company inventory
