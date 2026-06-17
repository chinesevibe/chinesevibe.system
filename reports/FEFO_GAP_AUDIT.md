# FEFO Gap Audit Report (Compact)

**Project:** hr-app `inv_*` · **Date:** 2026-06-17 · **Score:** 24/100 · **Status:** Not Ready

---

## 1. Executive Summary

| | |
|---|---|
| **FEFO now?** | No — stock is SKU×warehouse aggregate only; no lot allocator |
| **Top risks** | No `inv_stock_lots` · No FEFO/FIFO logic · Expiry on receipt lines only · Receive doesn't create movements |
| **Build first** | Lot table → receive creates lots → `inv_allocate_fefo` RPC → wire issue/consume/transfer |

---

## 2. What Exists

- **Master:** `inv_skus` (code, name, category, unit, min/max, active), suppliers, branches, warehouses, unit conversions
- **Receive:** `inv_inbound_items` has `lot_number`, `expiry_date`, cost; approve bumps `inv_stock_balances` only
- **Ops:** Requisitions (4-step), consumption, damage (+ photo/approval), transfer (in-transit), stock count
- **Ledger:** `inv_stock_movements` — partial (no `lot_id`, no before/after qty)
- **Alerts/Reports:** Low stock, near-expiry (from inbound lines), damage, variance, audit pages
- **BOM:** `inv_boms` schema only — no recipe consumption

---

## 3. Gap Table (Critical / High only)

| Area | Status | Gap | Severity |
|------|--------|-----|----------|
| Lot inventory (`inv_stock_lots`) | MISSING | No per-lot `remaining_qty` | Critical |
| FEFO allocator | MISSING | Zero FEFO/FIFO in codebase | Critical |
| Receive → lot + movement | MISSING | Approve only updates balance | Critical |
| Issue to kitchen | PARTIAL | Manual `lot_number`; checks total balance | Critical |
| Block expired/damaged lots | MISSING | No lot-level status | Critical |
| Multi-lot partial issue | MISSING | One lot per requisition line | Critical |
| Expiry alerts (real) | PARTIAL | Queries inbound lines, not on-hand lots | Critical |
| Waste at lot level | MISSING | `inv_damages` is SKU-level | Critical |
| SKU: expiry/lot flags, issue method | MISSING | Not on `inv_skus` | High |
| Transfer preserves expiry | PARTIAL | `lot_number` text only | High |
| Stock count by lot | PARTIAL | Optional lot text; unique per SKU | High |
| FEFO override + audit | MISSING | No permission/reason | High |
| BOM consumption + FEFO | PARTIAL | Schema only | High |
| Tests | MISSING | No inventory/FEFO tests | Critical |

---

## 4. Database

| Required | Actual | Status |
|----------|--------|--------|
| products | `inv_skus` | PARTIAL |
| stock_lots | — | **MISSING** |
| stock_movements | `inv_stock_movements` | PARTIAL (no `lot_id`) |
| stock_receipts/lines | `inv_inbound_*` | PARTIAL |
| stock_issues/lines | `inv_requisitions` + items | PARTIAL |
| transfers, counts, waste | `inv_transfers`, `inv_stock_counts`, `inv_damages` | PARTIAL |
| expiry_alerts, recipes | — / `inv_boms` | MISSING / PARTIAL |
| locations | — | MISSING (warehouse only) |

**Blocker:** `inv_stock_balances` = one row per SKU×warehouse — cannot hold multiple expiries.

---

## 5. Backend / API

| API | Status |
|-----|--------|
| Receive | PARTIAL — balance only, no lot/movement |
| Get/allocate lots (FEFO) | MISSING |
| Issue / consume / transfer / waste | PARTIAL — aggregate balance, manual lot text |
| Stock count finalize | EXISTS |
| Expiry alerts / dashboard | PARTIAL — inbound-based |

`inv_issue_requisition`: requires manual `lot_number`; checks `inv_stock_balances` total only.

---

## 6. Frontend

| Screen | Status |
|--------|--------|
| Inbound | PARTIAL — captures lot + expiry |
| Issue requisition | MANUAL lot entry, no FEFO suggestion |
| Stock / alerts / transfer / damage / count | PARTIAL — no true lot-level ops |

---

## 7. FEFO Logic

| Capability | Verdict |
|------------|---------|
| Track lots / expiry on stock | NO / PARTIAL |
| Allocate earliest expiry | NO |
| Block expired/damaged | NO |
| Split across lots | NO |
| FIFO fallback (no expiry) | NO |

Expected sort (expiry↑ → received↑ → lot_id↑) **not implemented**.

---

## 8. Min V1 Schema

```
inv_stock_lots: sku_id, warehouse_id, lot_number, expiry_date, received_date,
                remaining_qty, unit_cost, status (available|reserved|expired|damaged|depleted)

inv_skus + flags: expiry_required, lot_tracking_required, default_issue_method, shelf_life_days

inv_stock_movements + lot_id, qty_before, qty_after
inv_requisition_issue_lines: requisition_item_id, lot_id, qty, override_reason
```

---

## 9. Workflow (Target)

`Receive → create lot + movement → FEFO allocate on issue/consume → waste/transfer by lot_id → count per lot → reports`

---

## 10. Roadmap

**Phase 1 (Critical):** `inv_stock_lots` · receive creates lots · `inv_allocate_fefo` · tests  
**Phase 2 (High):** Wire issue, consume, transfer, damage, real alerts, override permission  
**Phase 3 (Medium):** Lot aging reports, BOM consumption, COGS, alert config  

Defer: bin/location WMS, POS auto-deduction, ack/resolve alert workflow.

---

## 11. Top Tasks

| ID | Goal |
|----|------|
| FEFO-001 | `inv_stock_lots` migration |
| FEFO-002 | SKU flags (expiry_required, default_issue_method) |
| FEFO-003 | Receive → lot + movement |
| FEFO-004 | `inv_allocate_fefo` RPC |
| FEFO-005 | Multi-lot partial allocation |
| FEFO-006–008 | Block expired · wire requisition · wire consumption |
| FEFO-009–011 | Transfer by lot · waste by lot · count by lot |
| FEFO-012–014 | Real expiry alerts · unit tests · override audit |

---

## 12. Final

- **FEFO now?** No  
- **Must build first:** lot table + receive + allocator + tests  
- **Can delay:** locations, POS, alert workflow, COGS  
- **Don't build yet:** full WMS before lot foundation
