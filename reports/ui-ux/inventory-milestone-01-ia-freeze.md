# Inventory Milestone 1

Date: 2026-06-22
Milestone: Inventory IA freeze and sitemap confirmation
Scope: audit and planning only

## Goal

Freeze the inventory information architecture before more UI changes land.

## Confirmed Primary Routes

- `/admin/inventory`
- `/admin/inventory/dashboard`
- `/admin/inventory/stock`
- `/admin/inventory/inbound`
- `/admin/inventory/requisition`
- `/admin/inventory/transfer`
- `/admin/inventory/stock-count`
- `/admin/inventory/consumption`
- `/admin/inventory/damage`
- `/admin/inventory/alerts`
- `/admin/inventory/reports/*`

## IA Findings

- The module already covers the main restaurant inventory workflows.
- The main problem is hierarchy and operator orientation, not missing pages.
- Dashboard and hub overlap too much as entry points.
- Reports and alerts are too detached from the action pages they should drive.
- Dense tables exist across routes, but action priority is not surfaced early enough.

## IA Freeze Decision

- Keep the existing route family.
- Rework page hierarchy and workspace framing before touching deeper flows.
- Make `/admin/inventory` the operational hub.
- Make `/admin/inventory/dashboard` the daily decision dashboard.
- Keep stock, inbound, requisition, transfer, stock count, damage, consumption, alerts, and reports as specialized workspaces.

## Out Of Scope

- Database schema
- API contracts
- Auth
- Stock calculation logic
- Inventory movement logic
- LIFF routes

## Acceptance Baseline For Later Milestones

- Inventory hub should answer "what needs action now?"
- Dashboard should answer "what changed today across branches?"
- Each workflow page should make its next action obvious.
- Mobile and desktop should preserve branch, warehouse, and status clarity.
