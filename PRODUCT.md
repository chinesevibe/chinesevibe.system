# Product

## Register

product

## Scope

This PRODUCT.md defines the product context for the mobile inventory workspace inside `hr-app`.

The focus is the mobile-first inventory webapp served under `/portal/*` for restaurant and multi-branch operations. It reuses the existing inventory domain, data access, and operational routes already present in the repo. It does not redefine the full HR product.

## Users

### Warehouse staff
- Work on the move inside receiving, staging, and warehouse aisles
- Need to receive stock, confirm quantities, check branch and warehouse context, and avoid wrong movement posts

### Branch staff
- Need a fast way to check current stock, shortages, and branch-specific availability before operations begin
- Often work from phones with limited time and unstable attention

### Kitchen staff
- Need clear stock visibility and downstream requisition / issue status
- Care more about whether an item is available, where it is, and what to do next than about admin reporting

### Admin / manager
- Need mobile access to operational work queues, not the full desktop admin density
- Need quick review of pending receive / transfer / alert work when away from the main dashboard

## Jobs To Be Done

- Start the day from one mobile inventory home and see what operational work matters now
- Look up stock quickly by item, barcode, branch, or warehouse
- Receive inbound stock against the correct order and warehouse
- Continue requisition and transfer receive work from a phone when away from the desktop
- Record damage and stock count with clear quantity and unit context
- See low stock and expiry alerts and jump straight into the corrective task

## Product Purpose

The mobile inventory workspace exists to make inventory operations usable on the warehouse floor, in branches, and during receiving work without forcing staff through desktop-heavy admin pages.

Success means:
- staff can complete one inventory task per screen on a phone
- branch and warehouse context is always visible before a stock movement is confirmed
- item, unit, quantity, and status are easy to scan
- entry routes from LINE or LIFF land users in the correct mobile flow
- existing admin inventory pages remain intact for dense back-office work

## Brand Personality

- practical
- direct
- operational

The interface should feel reliable and fast under real working conditions: one hand on the phone, one hand handling stock, mixed Thai/English labels, and no decorative UI that competes with the task.

## Anti-references

- A desktop admin page squeezed into a phone viewport
- KPI-heavy dashboards that hide the next operational action
- Fake metrics or decorative charts before the user can act
- Ambiguous stock movement confirmation states
- Generic card grids with equal weight for every task

## Design Principles

1. Mobile-first, not desktop-shrunk
   Each screen should support a single field task cleanly on 375-430px widths before scaling up.

2. One task per screen
   Receiving, stock lookup, transfer receive, damage, and count flows should not compete on the same view.

3. Show movement context before action
   Branch, warehouse, item, unit, lot, and quantity must be visible before confirming stock movement.

4. Important data first
   Stock availability, action status, and task readiness come before reports, charts, or secondary metadata.

5. Reuse the inventory domain already in the repo
   Keep existing data, actions, routes, and operational rules. Phase A-D is a UI and information architecture exercise, not a logic rewrite.

## Accessibility & Inclusion

- Target practical WCAG AA readability for mobile operational use
- Large touch targets for gloved, hurried, or one-handed use
- Thai and English text must wrap without breaking action layouts
- Status must not rely on color alone
- Reduced-motion safe by default; motion should only confirm state changes

## Constraints

- Use `/portal/*` as the primary mobile inventory route group
- Keep `/line/*` and `/liff/*` as entry points or redirects when needed
- Do not break `/admin/inventory/*`
- Do not change stock calculation logic
- Do not change inventory movement logic
- Do not change API contracts
- Do not change database schema
- Do not add dependencies for the mobile rollout by default

## Frozen Mobile Sitemap

### Primary mobile workspace
- `/portal/inventory`
  - mobile inventory home
  - today task summary
  - quick actions
  - alert shortcuts
  - branch / warehouse context entry

### Core mobile task routes
- `/portal/stock`
  - stock lookup
  - search / filter
  - below-min and out-of-stock emphasis

- `/portal/inbound`
  - inbound orders ready to receive
  - jump into scan flow

### Mobile task continuations through existing routes
- requisition receive
  - existing receive flow should continue from current inventory routes / LIFF receive entrypoints

- transfer receive
  - existing receive flow should continue from current inventory routes / LIFF receive entrypoints

- damage report
  - existing create flow should be adapted for mobile use rather than rewritten

- stock count
  - existing create/detail flow should be adapted for mobile use rather than rewritten

- alerts
  - low stock / expiry / abnormal stock alerts should route users to the relevant corrective page

### Entry routes
- `/line/stock`
- `/line/inbound`
- `/liff/inbound-scan`
- `/liff/inventory/requisition/[id]/receive`
- `/liff/inventory/transfer/[id]/receive`
- `/liff/inventory/damage/create`

These stay as entry or continuation paths and should route users into the correct mobile task without introducing a second inventory app.

## Route Strategy

- `/portal/*`
  - primary mobile inventory workspace
  - optimized for authenticated mobile usage
  - should become the operations-first surface

- `/line/*`
  - lightweight LINE entry routes
  - resolve user and redirect to the correct inventory mobile path

- `/liff/*`
  - specialized LIFF flows for scan-heavy or task-specific continuation screens
  - keep when the LIFF/browser context is operationally useful

- `/admin/inventory/*`
  - desktop or dense admin workspace
  - remain the source of broad inventory management and master data
  - mobile project may reuse components and actions from here, but should not break it

## Existing Routes And Components To Reuse

### Existing routes
- `src/app/portal/inventory/page.tsx`
- `src/app/portal/stock/page.tsx`
- `src/app/portal/inbound/page.tsx`
- `src/app/line/stock/page.tsx`
- `src/app/line/inbound/page.tsx`
- `src/app/liff/inbound-scan/page.tsx`
- `src/app/liff/inbound-scan/[orderId]/page.tsx`
- `src/app/liff/inventory/requisition/[id]/receive/page.tsx`
- `src/app/liff/inventory/transfer/[id]/receive/page.tsx`
- `src/app/liff/inventory/damage/create/page.tsx`

### Existing components and data helpers
- `src/components/brand/AdminPageShell.tsx`
- `src/features/inventory/InventoryHub.tsx`
- `src/features/inventory/InventoryExecutiveDashboard.tsx`
- `src/features/inventory/InventorySubNav.tsx`
- `src/features/inventory/InboundScanPageContent.tsx`
- `src/features/inventory/InboundBarcodeScanner.tsx`
- `src/features/inventory/InventorySearchBar.tsx`
- `src/features/inventory/StockFilters.tsx`
- `src/features/inventory/InboundOrderActions.tsx`
- `src/features/inventory/RequisitionListTable.tsx`
- `src/features/inventory/TransferListTable.tsx`
- `src/features/inventory/DamageCreateForm.tsx`
- `src/features/inventory/StockCountCreateForm.tsx`
- `src/features/inventory/inbound-data.ts`
- `src/features/inventory/stock-data.ts`
- `src/features/inventory/expansion-data.ts`

### Reuse guidance
- Reuse data loaders and server actions before creating new mobile-specific ones
- Reuse form fields and status components where they already express the inventory rules correctly
- Prefer adapting admin inventory components into mobile layouts over creating parallel logic paths

## Phase B Implementation Plan

### Goal
Implement `/portal/inventory` as the operations-first mobile inventory home without changing inventory business logic.

### Scope
- strengthen the mobile home hierarchy
- show today operations summary without fake metrics
- surface quick actions for:
  - stock lookup
  - inbound receive
  - requisition / issue continuation
  - transfer receive
  - damage report
  - stock count
  - alerts
- make branch / warehouse context visible near the top
- keep one obvious primary action per task tile

### Implementation approach
1. Start from `src/app/portal/inventory/page.tsx`
2. Reuse `AdminPageShell` and existing inventory tone / tokens from `src/app/globals.css`
3. Borrow operational hierarchy from `InventoryHub.tsx` and dashboard intent from `InventoryExecutiveDashboard.tsx`
4. Keep the page mobile-first and task-first
5. Do not add new APIs or duplicate business logic

### Phase B acceptance
- `/portal/inventory` is clearly the mobile inventory home
- first-screen actions are understandable on 375px width
- route choices reflect real operational tasks, not admin sitemap completeness
- branch / warehouse context is visible
- no dependency, schema, API, or stock-logic changes are required

## Out Of Scope For Phase A-D

- Rewriting inventory calculation or movement rules
- Replacing admin inventory as the full management workspace
- Creating a second inventory backend
- Adding new dependencies for visual polish alone
- Changing schema or API contracts to make the first mobile rollout possible
