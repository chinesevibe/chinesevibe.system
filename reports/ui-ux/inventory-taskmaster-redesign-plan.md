# Inventory UI/UX Redesign — Taskmaster Plan

Date: 2026-06-23
Project: hr-app inventory workspace
Scope: planning only
Status: ready for implementation

## Purpose

This plan turns the current inventory module into an operations-first workspace without changing inventory business logic, schema, API contracts, or auth architecture.

This file continues the existing planning docs:

- `reports/ui-ux/inventory-milestone-01-ia-freeze.md`
- `reports/ui-ux/inventory-milestone-02-dashboard-plan.md`

Milestones 1-2 are already complete as planning outputs. This file adds a Taskmaster-ready execution sequence for Milestones 3-14.

## Global Rules

- Do not change database schema.
- Do not change API contracts.
- Do not change auth logic unless a proven routing bug blocks access.
- Do not change stock calculation logic.
- Do not change inventory movement logic.
- Do not touch LIFF check-in/check-out routes.
- Do not add dependencies unless strictly necessary.
- Reuse existing inventory and portal components first.

## Global Validation

```bash
rtk npm run build
rtk npm run typecheck
rtk npm run lint
```

## Browser QA Breakpoints

- 375px
- 430px
- 768px
- 1024px
- 1440px

## Taskmaster Sequence

| Task | Milestone | Goal | Dependency | Risk |
|------|-----------|------|------------|------|
| T150 | M1 | IA freeze and sitemap confirmation | none | low |
| T151 | M2 | Hub and dashboard redesign plan | T150 | low |
| T152 | M3 | Implement inventory hub hierarchy | T151 | medium |
| T153 | M4 | Implement operations-first dashboard | T152 | medium |
| T154 | M5 | Redesign stock workspace | T152 | medium |
| T155 | M6 | Redesign inbound workflow UI | T152 | medium |
| T156 | M7 | Redesign requisition workflow UI | T152 | medium |
| T157 | M8 | Redesign transfer workflow UI | T152 | medium |
| T158 | M9 | Redesign stock count workflow UI | T152 | high |
| T159 | M10 | Redesign damage and consumption UI | T152 | medium |
| T160 | M11 | Redesign alerts and reports UX | T153,T154,T155,T156,T157,T158,T159 | medium |
| T161 | M12 | Responsive QA and browser QA | T152,T153,T154,T155,T156,T157,T158,T159,T160 | medium |
| T162 | M13 | Cross-flow QA across admin, portal, and LINE entry routes | T161 | medium |
| T163 | M14 | Final demo QA and limitations handoff | T162 | low |

---

## T150 — Milestone 1

Goal:
Freeze the inventory sitemap and confirm route roles before more UI changes.

Tasks:
- Confirm `/admin/inventory` remains the main admin hub.
- Confirm `/admin/inventory/dashboard` remains the decision dashboard.
- Confirm specialized routes stay separate: stock, inbound, requisition, transfer, stock-count, consumption, damage, alerts, reports.
- Confirm portal/mobile inventory stays inside the same app, not as a separate standalone site.

Likely files involved:
- `reports/ui-ux/inventory-milestone-01-ia-freeze.md`
- `reports/INVENTORY_ROADMAP.md`
- `reports/PORTAL_ROADMAP.md`

Files not to touch:
- `supabase/migrations/**`
- `src/app/api/**`
- inventory server actions
- auth role logic

Acceptance criteria:
- Route ownership is clear.
- Admin vs portal responsibilities are documented.
- No duplicate entry-point strategy remains ambiguous.

Validation command:
- none, planning only

Browser QA requirement:
- no

Recommended Codex prompt:
- `Audit only. Confirm inventory IA freeze and route ownership across /admin/inventory, /portal/inventory, /portal/stock, /portal/inbound, /line/stock, /line/inbound.`

---

## T151 — Milestone 2

Goal:
Lock the page structure for the admin inventory hub and dashboard before implementation.

Tasks:
- Define hierarchy for `/admin/inventory`.
- Define hierarchy for `/admin/inventory/dashboard`.
- Set priority order: actions, alerts, branch context, movements, then charts.
- Mark charts and KPI blocks as secondary orientation.

Likely files involved:
- `reports/ui-ux/inventory-milestone-02-dashboard-plan.md`
- `src/features/inventory/InventoryHub.tsx`
- `src/features/inventory/InventoryExecutiveDashboard.tsx`

Files not to touch:
- inventory data loaders
- server actions
- stock calculation logic

Acceptance criteria:
- Hub and dashboard no longer overlap conceptually.
- Implementation order is clear.

Validation command:
- none, planning only

Browser QA requirement:
- no

Recommended Codex prompt:
- `Planning only. Convert InventoryHub and InventoryExecutiveDashboard into operations-first layouts using existing data and components.`

---

## T152 — Milestone 3

Goal:
Implement the main inventory workspace as a clear operational hub.

Tasks:
- Recompose `/admin/inventory` so it answers what needs action now.
- Surface alert inbox before KPI decoration.
- Add quick actions for receive, issue, transfer, count, damage, alerts, reports.
- Keep branch and warehouse scope visible.
- If portal inventory workspace is active, align portal shortcut structure with the admin hub without creating a separate app.

Likely files involved:
- `src/app/admin/inventory/page.tsx`
- `src/features/inventory/InventoryHub.tsx`
- `src/app/portal/inventory/page.tsx`
- `src/components/portal/portal-nav.ts`
- `src/features/portal/PortalHomeDashboard.tsx`

Files not to touch:
- `src/app/api/**`
- `supabase/**`
- inventory server actions
- stock movement logic

Acceptance criteria:
- First screen shows action hierarchy, not raw data density.
- Quick actions are obvious on desktop and mobile.
- Portal inventory entry points do not fragment the workspace.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory` and `/portal/inventory`

Recommended Codex prompt:
- `Implement only inventory hub hierarchy and portal inventory entry cleanup. Keep business logic unchanged.`

---

## T153 — Milestone 4

Goal:
Turn `/admin/inventory/dashboard` into a daily operations dashboard.

Tasks:
- Move critical alerts and exceptions above analytics.
- Summarize receiving, issue, transfer, stock count, and pending approvals.
- Keep branch comparison visible without overwhelming the first fold.
- Keep KPI/charts secondary but still useful for managers.

Likely files involved:
- `src/app/admin/inventory/dashboard/page.tsx`
- `src/features/inventory/InventoryExecutiveDashboard.tsx`
- small shared inventory UI helpers if required

Files not to touch:
- report queries
- stock movement logic
- database schema

Acceptance criteria:
- Dashboard is readable in one pass.
- Urgent operational items appear before long-form analytics.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/dashboard`

Recommended Codex prompt:
- `Implement dashboard layout only. Promote alerts, today summary, branch snapshot, and recent movement above KPI/charts.`

---

## T154 — Milestone 5

Goal:
Make stock visibility fast to scan on desktop and mobile.

Tasks:
- Redesign stock filters for branch, warehouse, search, below-min, zero-stock.
- Improve stock table readability and action clarity.
- Keep quantity, min, unit, branch, warehouse, lot/expiry visibility where available.
- Preserve or improve existing mobile stock card layout.

Likely files involved:
- `src/app/admin/inventory/stock/**`
- `src/features/inventory/**stock*`
- `src/app/portal/stock/page.tsx`

Files not to touch:
- stock balance calculation
- inventory write actions
- barcode lookup logic

Acceptance criteria:
- HR can identify low stock and zero stock quickly.
- No unnecessary horizontal scroll on 375px and 430px.
- Mobile cards preserve quantity and branch context.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/stock`, `/portal/stock`

Recommended Codex prompt:
- `Redesign stock workspace for scanability. Keep stock data logic unchanged and focus on filters, columns, badges, and mobile cards.`

---

## T155 — Milestone 6

Goal:
Make receiving and inbound operations easy to execute without confusion.

Tasks:
- Simplify inbound list hierarchy.
- Make receiving status, supplier, branch, warehouse, and action state obvious.
- Improve `/admin/inventory/inbound` and mobile/portal receiving entry readability.
- Preserve scan flow and receiving detail behavior.

Likely files involved:
- `src/app/admin/inventory/inbound/**`
- `src/app/portal/inbound/page.tsx`
- `src/features/inventory/**inbound*`

Files not to touch:
- inbound approval logic
- scan write logic
- barcode resolution logic

Acceptance criteria:
- Users can distinguish pending, scanned, approved, and completed states immediately.
- Portal receiving route is readable on mobile.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/inbound`, `/portal/inbound`

Recommended Codex prompt:
- `Redesign inbound workflow UI only. Preserve receiving logic, scan flow, and API contracts.`

---

## T156 — Milestone 7

Goal:
Clarify requisition and kitchen issue flow end-to-end.

Tasks:
- Improve request list hierarchy and status visibility.
- Make requester, branch, department, requested qty, issued qty, and next action obvious.
- Clarify approve, issue, and receive actions without changing workflow logic.

Likely files involved:
- `src/app/admin/inventory/requisition/**`
- `src/features/inventory/**requisition*`

Files not to touch:
- requisition workflow state transitions
- issue stock logic
- database schema

Acceptance criteria:
- Admin and warehouse staff can read requisition status at a glance.
- Desktop table and mobile cards show the same operational truth.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/requisition`

Recommended Codex prompt:
- `Improve requisition list/detail usability only. Keep state machine and stock impact untouched.`

---

## T157 — Milestone 8

Goal:
Make transfer operations understandable across branches.

Tasks:
- Emphasize from/to branch and status.
- Clarify sent vs received quantities.
- Make transfer actions predictable on list and detail views.

Likely files involved:
- `src/app/admin/inventory/transfer/**`
- `src/features/inventory/**transfer*`

Files not to touch:
- transfer send/receive logic
- transfer movement records
- API contracts

Acceptance criteria:
- Cross-branch handoff state is readable without opening the row detail first.
- Transfer status and quantity variance are visible.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/transfer`

Recommended Codex prompt:
- `Redesign transfer workflow UI. Prioritize from/to branch, quantity, status, and actions.`

---

## T158 — Milestone 9

Goal:
Make stock count execution trustworthy and mobile-usable.

Tasks:
- Clarify count plan status, assigned scope, and variance visibility.
- Make count execution state obvious.
- Improve mobile count readability if count UI exists in responsive web.

Likely files involved:
- `src/app/admin/inventory/stock-count/**`
- `src/features/inventory/**stock-count*`

Files not to touch:
- variance calculation
- adjustment creation logic
- database schema

Acceptance criteria:
- Count list clearly distinguishes draft, counting, completed, cancelled.
- Variance is visible without deep inspection.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/stock-count`

Recommended Codex prompt:
- `Improve stock-count workflow readability and mobile execution UX without touching variance logic.`

---

## T159 — Milestone 10

Goal:
Clarify damage and consumption workflows so operators do not confuse them.

Tasks:
- Separate intent and terminology between damage and consumption.
- Make reason, type, value, branch, and approval state visible.
- Improve empty/loading/error states if present.

Likely files involved:
- `src/app/admin/inventory/damage/**`
- `src/app/admin/inventory/consumption/**`
- `src/features/inventory/**damage*`
- `src/features/inventory/**consumption*`

Files not to touch:
- approval thresholds
- stock deduction logic
- storage upload behavior

Acceptance criteria:
- Damage and consumption are visually and operationally distinct.
- Users can tell which actions require approval.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/damage`, `/admin/inventory/consumption`

Recommended Codex prompt:
- `Redesign damage and consumption pages for role clarity and status scanability only.`

---

## T160 — Milestone 11

Goal:
Make alerts and reports actionable instead of passive.

Tasks:
- Redesign alerts to guide action by severity and route.
- Redesign reports hub so users know which report to open first.
- Improve branch, warehouse, date, and export affordances.

Likely files involved:
- `src/app/admin/inventory/alerts/**`
- `src/app/admin/inventory/reports/**`
- `src/features/inventory/**alert*`
- `src/features/inventory/**report*`

Files not to touch:
- report export logic
- report query contracts
- alert generation logic

Acceptance criteria:
- Alerts connect clearly to next actions.
- Reports are grouped by operational decision, not just raw categories.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, `/admin/inventory/alerts`, `/admin/inventory/reports`

Recommended Codex prompt:
- `Redesign alerts and reports UX only. Keep alert generation and report data logic unchanged.`

---

## T161 — Milestone 12

Goal:
Run responsive QA across the redesigned inventory module.

Tasks:
- Test all target routes at 375, 430, 768, 1024, 1440.
- Check no horizontal scroll unless tables genuinely require it.
- Check filters, cards, tables, pagination, and Thai wrapping.
- Check mobile readability in portal inventory routes too.

Likely files involved:
- implementation files from T152-T160
- QA docs under `reports/ui-ux/`

Files not to touch:
- business logic files
- database and API files

Acceptance criteria:
- Readability and actions hold across breakpoints.
- No critical responsive regressions remain.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, required

Recommended Codex prompt:
- `Browser QA only. Audit inventory routes across 375, 430, 768, 1024, 1440 and report layout regressions.`

---

## T162 — Milestone 13

Goal:
Verify the inventory flow works across entry points, not just inside isolated pages.

Tasks:
- QA dashboard to stock flow.
- QA stock to inbound flow.
- QA stock to requisition flow.
- QA stock to transfer flow.
- QA stock to count flow.
- QA portal inventory to portal stock and portal inbound.
- QA LINE entry routes `/line/stock` and `/line/inbound` for correct routing behavior.

Likely files involved:
- implementation files from T152-T160
- `src/app/line/stock/page.tsx`
- `src/app/line/inbound/page.tsx`
- `src/lib/line/inventory-entry.ts`

Files not to touch:
- LINE messaging logic unrelated to inventory routing
- stock/inbound server actions

Acceptance criteria:
- Entry points land in the correct workspace.
- Users do not bounce to unrelated admin home routes.
- Portal and admin inventory routes stay consistent.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, required

Recommended Codex prompt:
- `Cross-flow QA only. Verify inventory entry routes across admin, portal, and LINE gateway pages.`

---

## T163 — Milestone 14

Goal:
Prepare the final demo state and document known limitations honestly.

Tasks:
- Run final browser QA pass.
- Record known limitations and non-blocking gaps.
- Confirm no new warnings or regressions were introduced by redesign work.
- Prepare client/demo handoff notes.

Likely files involved:
- `reports/ui-ux/inventory-milestone-13-cross-flow-qa.md`
- `reports/ui-ux/inventory-milestone-14-final-demo-qa.md`
- final handoff docs if needed

Files not to touch:
- inventory runtime logic
- auth
- schema

Acceptance criteria:
- Demo routes are stable.
- Known limitations are documented clearly.
- Final handoff is honest and actionable.

Validation command:
- `rtk npm run build && rtk npm run typecheck && rtk npm run lint`

Browser QA requirement:
- yes, required

Recommended Codex prompt:
- `Final demo QA only. Verify inventory redesign routes and write known limitations without editing business logic.`

---

## Recommended Execution Order

1. T152 — inventory hub hierarchy
2. T153 — dashboard hierarchy
3. T154 — stock workspace
4. T155 — inbound workflow
5. T156 — requisition workflow
6. T157 — transfer workflow
7. T158 — stock-count workflow
8. T159 — damage and consumption
9. T160 — alerts and reports
10. T161 — responsive QA
11. T162 — cross-flow QA
12. T163 — final demo QA and handoff

## First Implementation Target

Start with T152.

Reason:
- It fixes the top-level inventory entry problem first.
- It aligns admin and portal inventory navigation early.
- It reduces later rework across stock, inbound, and dashboard pages.
