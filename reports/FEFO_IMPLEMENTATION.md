# FEFO Implementation Summary

**Epic:** FEFO-001–FEFO-014  
**Date:** 2026-06-17  
**Status:** Implemented in repo — **migration not applied to prod yet**

## Migrations (apply in order)

1. `20260617120000_inv_fefo_foundation.sql` — lots, SKU flags, receive, allocator
2. `20260617120100_inv_fefo_rpcs.sql` — issue, consumption, damage, transfer
3. `20260617120200_inv_fefo_stock_count.sql` — count by lot

## Task coverage

| ID | Status | Notes |
|----|--------|-------|
| FEFO-001 | ✅ | `inv_stock_lots` + movement columns |
| FEFO-002 | ✅ | SKU flags + form |
| FEFO-003 | ✅ | `inv_approve_inbound_order` creates lots |
| FEFO-004 | ✅ | `inv_allocate_fefo` RPC |
| FEFO-005 | ✅ | `inv_requisition_issue_lines` + multi-lot issue |
| FEFO-006 | ✅ | Expired/damaged excluded in allocator |
| FEFO-007 | ✅ | Requisition issue + FEFO preview UI |
| FEFO-008 | ✅ | Consumption uses FEFO |
| FEFO-009 | ✅ | Transfer by lot_id, expiry preserved |
| FEFO-010 | ✅ | Damage `lot_id` + approve |
| FEFO-011 | ✅ | Stock count snapshots per lot |
| FEFO-012 | ✅ | Alerts from `inv_stock_lots` |
| FEFO-013 | ✅ | `src/lib/inventory/fefo.test.ts` |
| FEFO-014 | ✅ | `listFefoOverrideAudit` action |

## Gates

- typecheck ✅
- lint ✅ (0 errors)
- test ✅ (20 pass)
- build ✅ (2026-06-17 review)

## User actions

1. `supabase db push` (or MCP apply migrations)
2. Smoke: receive → issue requisition → verify lot deduction
3. Deploy Vercel after migration

## Caveats

- Legacy stock backfilled as `LEGACY-{sku}` lots
- Transfer without `lot_id` fails if FEFO spans multiple lots
- BOM/POS consumption deferred
