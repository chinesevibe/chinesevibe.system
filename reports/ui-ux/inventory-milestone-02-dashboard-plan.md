# Inventory Milestone 2

Date: 2026-06-22
Milestone: Inventory hub and dashboard redesign plan
Scope: planning only

## Goal

Turn the inventory hub and dashboard into operations-first workspaces without changing stock logic.

## Current Problem

- Existing inventory pages expose data, but not the order of work.
- KPI blocks compete with action discovery.
- Alerts, branch context, and recent movement are not prioritized enough.

## Planned Structure

### `/admin/inventory`

1. Page header with branch-aware summary
2. Today operations summary
3. Alert and action inbox
4. Quick actions
5. Branch and warehouse snapshot
6. Recent movement
7. Secondary guides or references

### `/admin/inventory/dashboard`

1. Page header with date and branch scope
2. Critical alerts first
3. Daily receiving, issue, transfer, and stock count summary
4. Branch comparison snapshot
5. Recent movements and exceptions
6. KPI and charts as secondary context

## Reuse First

- `InventoryHub`
- `InventoryExecutiveDashboard`
- `InventoryDashboardWidgets`
- `InventoryFilterBar`
- existing inventory cards, tables, and badges where readable

## New UI Rules

- Show action before analytics.
- Keep branch and warehouse visible near every operational decision.
- Use summary cards for triage, not decoration.
- Keep tables for detail, not first orientation.
- Mobile cards must keep item name, branch, quantity, and status visible without horizontal scrolling.

## Files Expected To Change In Implementation Milestones

- `src/features/inventory/InventoryHub.tsx`
- `src/features/inventory/InventoryExecutiveDashboard.tsx`
- `src/app/admin/inventory/page.tsx`
- `src/app/admin/inventory/dashboard/page.tsx`
- small shared inventory UI helpers only if required

## Files Not To Touch

- inventory server actions
- validators
- stock calculation logic
- movement logic
- database schema
- API contracts
- auth
- LIFF routes

## Exit Criteria For Milestones 3-4

- Hub becomes the primary inventory workspace.
- Dashboard becomes readable in daily operations.
- Alerts and quick actions are visible without hunting.
- No horizontal scroll on target admin breakpoints unless data tables genuinely require it.
