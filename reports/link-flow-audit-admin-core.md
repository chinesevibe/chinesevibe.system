# Admin Core Link Flow Audit

Date: 2026-06-19
Scope: `Admin nav + Dashboard + Employees + Attendance + Branch + Payroll`

## 1. Route map

### Global nav

| Label | Route | Notes |
| --- | --- | --- |
| แดชบอร์ด | `/admin` | HR dashboard hub |
| พนักงาน | `/admin/employees` | employee list |
| การเข้างาน | `/admin/attendance` | today roster + history in one route |
| จัดการลา | `/admin/leaves` | approvals / leave management |
| OT | `/admin/overtime` | overtime queue |
| การแจ้งเตือน | `/admin/alerts` | compliance / reminders |
| Payroll | `/admin/payroll` | payroll hub |
| สาขา | `/admin/branches` | branch list for HR |
| รายงานและวิเคราะห์ | `/admin/report` | canonical reports route |

### Alternate / legacy routes

| Route | Behavior | UX note |
| --- | --- | --- |
| `/admin/reports` | redirect -> `/admin/report` | duplicate naming |
| `/admin/branches/[id]` | redirect -> slug route | acceptable legacy support |
| `/admin/branches/[id]/attendance` | redirect -> `/admin/attendance?branch_id=...` | loses branch page context |
| `/admin/branch/attendance` | redirect -> `/admin/branch` | hidden branch-manager path |
| `/admin/branch/leaves` | redirect -> `/admin/branch` | hidden branch-manager path |
| `/admin/branch/overtime` | redirect -> `/admin/branch` | hidden branch-manager path |
| `/admin/branch/team` | redirect -> `/admin/branch` | hidden branch-manager path |

## 2. Entry points

### Header

| Entry | Target | Notes |
| --- | --- | --- |
| Header search | `/admin/employees?q=...` | behaves as employee-only jump, not true global search |
| Notification bell items | mixed item hrefs | context-aware but hidden behind bell |
| Mobile menu | same nav groups as sidebar | consistent with sidebar |

### Dashboard

| Source | Target | Notes |
| --- | --- | --- |
| KPI cards | `/admin/employees`, `/admin/attendance`, `/admin/leaves?status=pending`, `/admin/alerts`, `/admin/documents`, `/admin/complaints?status=open` | good shortcuts, repeated with widgets |
| Quick actions | employee new, leaves, alerts, payroll, documents, attendance | overlaps sidebar heavily |
| Attendance widgets | `/admin/attendance` or item-level links | mixed click affordance |
| Compliance widgets | item-level employee profile links | good deep-link behavior |

### Employees

| Source | Target | Notes |
| --- | --- | --- |
| Employee row click | `/admin/employees/:id` | full-row navigation |
| Employee code/name/actions | `/admin/employees/:id` | nested links inside clickable row |
| Add employee | `/admin/employees/new` | clear |
| Onboarding badge | `/admin/employees?status=onboarding` | useful filtered jump |

### Attendance

| Source | Target | Notes |
| --- | --- | --- |
| Today roster cards | `/admin/employees/:id/attendance?...` | good contextual deep-link |
| History row employee link | `/admin/employees/:id/attendance?month=...&date=...&from=...&to=...` | deep drill-down |
| Tabs today/history | same route, `view=` query | keeps too much mixed state |
| Employee attendance back link | `/admin/employees/:id` | does not restore prior context |
| Employee attendance month arrows | same page, `month=` only | drops right-side filter context |

### Branch

| Source | Target | Notes |
| --- | --- | --- |
| Branch list | `/admin/branch/:slug` | HR branch detail |
| Branch detail quick link: Attendance | `/admin/attendance?branch_id=...` | jumps out of branch context |
| Branch detail quick link: Leave/OT | branch subpaths | preserves branch context better |
| Branch employee name | `/admin/employees/:id` | useful cross-module deep-link |

### Payroll

| Source | Target | Notes |
| --- | --- | --- |
| Payroll hub actions | `/admin/payroll/runs`, `/admin/payroll/settings` | clear local nav |
| Portal payslips link | `/portal/payslips` | cross-surface jump |
| Payroll tables | none | missing drill-down to employee / attendance |

## 3. Local nav patterns

### Attendance

- `today/history` share one route and switch via `view=`
- filters mutate query directly
- pagination mutates query directly
- employee attendance page reuses attendance filters in `mode="employee"`

### Employees

- filters + pagination on one list route
- profile page is separate route
- attendance is a sub-route under profile route tree but visually behaves like another app surface

### Payroll

- local actions are just buttons/links at top of hub
- no subnav component on hub itself, though `PayrollSubNav.tsx` exists elsewhere

## 4. Contextual links

### Good

- attendance today roster -> employee attendance
- compliance reminders -> employee profile
- pending registrations -> employee profile
- branch employee rows -> employee profile

### Weak

- employee list -> profile -> attendance -> back: context is lost
- attendance history -> employee attendance -> back: context is lost
- branch detail -> attendance: branch context is lost because flow exits branch module
- payroll table rows are not linkable, so investigation stops there

## 5. Main UX risks

### P1

1. Employee attendance calendar looks interactive but cannot be used as a true browse-back calendar.
2. Calendar month navigation drops `date/from/to/page` context on the right pane.
3. Back links in employee profile / employee attendance are hardcoded and do not restore prior list/filter state.
4. Header search appears global but is actually an employee-only module jump.
5. Branch quick link to Attendance exits branch context instead of opening a branch-scoped attendance surface with a clear return path.

### P2

1. `เดือนนี้` label in attendance calendar does not mean “go to current month”; it means “reload this month”.
2. Dashboard cards use inconsistent click targets: header-only, footer-only, inner-list-only, or multiple targets.
3. Naming is inconsistent across navigation: `การเข้างาน`, `Attendance`, `Attendance Issues`, `รายงานเข้างาน`.
4. Canonical route is `/admin/report`, but `/admin/reports` still exists as a redirect and keeps naming drift alive.
5. Employees table uses whole-row navigation plus nested links, which works but increases accidental navigation risk.

## 6. Quick wins

1. Make employee attendance calendar clickable for view-only day navigation, separate from retro edit eligibility.
2. Preserve return context with a lightweight `returnTo` query for:
   - employees list -> profile
   - profile -> attendance
   - attendance history -> employee attendance
3. Change calendar middle button from `เดือนนี้` to either:
   - real current month jump, or
   - rename it to `เดือนที่เลือก`
4. Rename header search explicitly, e.g. `ค้นหาพนักงาน`, or move to employees module only.
5. Add employee/profile links from payroll hub tables.

## 7. Bigger fixes

1. Define one canonical navigation model per module:
   - global hub
   - module list
   - detail
   - sub-detail
2. Normalize route naming:
   - one canonical reports path
   - one branch manager model
3. Standardize dashboard card behavior:
   - full-card clickable, or
   - explicit CTA only
   - not both mixed arbitrarily

## 8. Recommended implementation order

1. Employees + Attendance return-context and calendar behavior
2. Header search semantics
3. Branch -> Attendance scoped return flow
4. Payroll drill-down links
5. Naming cleanup and dashboard click-target consistency
