# Web UI Audit — CNV WorkHub (`web-only`)

Date: 2026-06-20  
Scope: browser-based product surfaces only (`/`, `/login`, `/register`, `/register/pending`, `portal/*`, `admin/*`)  
Out of scope: `liff/*`, LINE OA messages/menus, LIFF-only flows

## Mockup Artifacts

HTML direction previews live in:

- [mockups/web-ui/login.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/login.html)
- [mockups/web-ui/register.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/register.html)
- [mockups/web-ui/register-pending.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/register-pending.html)
- [mockups/web-ui/portal-home.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/portal-home.html)
- [mockups/web-ui/admin-dashboard.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/admin-dashboard.html)
- [mockups/web-ui/admin-workspace.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/admin-workspace.html)
- [mockups/web-ui/settings.html](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/mockups/web-ui/settings.html)

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Localization and control labels are inconsistent on auth screens |
| 2 | Performance | 3/4 | Web shells are mostly lean; issues are more about UX density than render cost |
| 3 | Responsive Design | 2/4 | Entry forms are workable on mobile, but dense admin pages and portal shortcuts need stronger mobile structure |
| 4 | Theming | 2/4 | Tokens exist, but hard-coded colors and mixed visual styles break consistency |
| 5 | Anti-Patterns | 2/4 | Product UI is serviceable, but several screens drift into decorative gradients, over-rounded containers, and mixed component vocabulary |
| **Total** |  | **11/20** | **Acceptable — significant work needed** |

## Anti-Patterns Verdict

Pass/fail: **partial fail**

The web UI does not look like generic AI slop end-to-end, but it does show several “assembled over time” tells:

- auth uses mascot/welcome framing that competes with the actual decision the user needs to make
- portal web shortcuts still route heavily into LIFF, so the web product feels structurally unfinished
- admin work pages mix restrained product UI with decorative gradient containers and oversized radii
- settings uses raw boxes with weak hierarchy, which reads more like internal scaffolding than a finished operations surface

## Executive Summary

- Audit Health Score: **11/20** (`Acceptable`)
- Issue count: `0 P0`, `4 P1`, `5 P2`, `3 P3`
- Top critical issues:
  - web entry does not separate sign-in vs registration clearly enough
  - portal home still depends on LIFF-first shortcuts despite web-only product expectations
  - auth control labels are not consistently localized
  - admin dense work screens need a stronger information hierarchy and calmer visual system
- Recommended next steps:
  1. fix auth entry and registration path clarity
  2. redesign portal shortcuts for web-native actions
  3. normalize admin workspace shells and dense page framing
  4. tighten settings hierarchy and operational messaging

## Detailed Findings by Severity

### P1

**[P1] Login page prioritizes mascot/welcome over path choice**  
Location: [AuthPageShell.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/AuthPageShell.tsx:10), [LoginPageContent.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/LoginPageContent.tsx:33)  
Category: Responsive / Anti-Pattern / UX clarity  
Impact: Users landing on `/login` have to infer whether they should sign in, register, or use LINE; the page spends too much visual weight on brand chrome relative to the decision.  
Recommendation: Reframe the screen around entry choice first, with registration promoted to a clear secondary path and non-essential hero framing reduced.  
Suggested command: `$impeccable clarify /login`

**[P1] Portal web home still routes core actions into LIFF surfaces**  
Location: [PortalHomeDashboard.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/portal/PortalHomeDashboard.tsx:156)  
Category: UX architecture  
Impact: In a web-only audit, the employee portal fails the “stay in the same product” test. Core shortcuts send users to an out-of-scope surface instead of completing the task inside web.  
Recommendation: Replace LIFF-first shortcuts with web-native destinations wherever the browser product is expected to stand on its own.  
Suggested command: `$impeccable shape portal`

**[P1] Pending registration messaging conflicts with web-product expectations**  
Location: [PendingRegistrationCard.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/components/auth/PendingRegistrationCard.tsx:30)  
Category: Clarify / IA  
Impact: The screen tells users there is “no web dashboard” while the product clearly contains browser-based employee surfaces. That creates trust debt and route confusion.  
Recommendation: Rewrite the pending-state copy around account activation status, not channel politics.  
Suggested command: `$impeccable clarify /register/pending`

**[P1] Password visibility controls are hard-coded in Thai**  
Location: [EmployeeCodeLoginForm.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/EmployeeCodeLoginForm.tsx:163), [EmployeeCodeLoginForm.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/EmployeeCodeLoginForm.tsx:188)  
Category: Accessibility / i18n  
Impact: Screen-reader labels are not aligned with the selected locale, reducing accessibility and multilingual consistency on a critical auth path.  
WCAG/Standard: WCAG 3.1.2 Language of Parts, WCAG 4.1.2 Name Role Value  
Recommendation: Move these labels into the translation system and keep auth controls locale-complete.  
Suggested command: `$impeccable harden auth`

### P2

**[P2] Admin attendance screen uses decorative container styling on a dense work surface**  
Location: [admin/attendance/page.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/app/admin/attendance/page.tsx:73), [admin/attendance/page.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/app/admin/attendance/page.tsx:120)  
Category: Anti-Pattern / Layout  
Impact: Oversized `rounded-[2rem]` and gradient container treatments compete with the real job, which is scanning filters, anomalies, and rows quickly.  
Recommendation: Simplify workspace framing and put contrast into structure, not decorative surface treatment.  
Suggested command: `$impeccable distill /admin/attendance`

**[P2] Settings page has weak hierarchy between sections**  
Location: [admin/settings/page.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/app/admin/settings/page.tsx:37)  
Category: Layout / Clarify  
Impact: Important settings, health checks, and runtime defaults sit in similarly weighted boxes, making it harder to separate status from editable configuration.  
Recommendation: Group by operator intent: health, runtime defaults, automation, and shift configuration.  
Suggested command: `$impeccable layout /admin/settings`

**[P2] Auth theming is partly tokenized but still relies on hard-coded brand blocks**  
Location: [AuthPageShell.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/AuthPageShell.tsx:19), [LineLoginButton.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/LineLoginButton.tsx:14)  
Category: Theming  
Impact: Shared product vocabulary is diluted because some surfaces honor tokens while others bypass them with direct color decisions.  
Recommendation: Keep brand accents, but route them through a consistent token layer for auth CTAs and support states.  
Suggested command: `$impeccable colorize auth`

**[P2] Register form is logically grouped but visually long and state-heavy**  
Location: [RegisterForm.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/RegisterForm.tsx:34)  
Category: Responsive / Onboarding  
Impact: The form is structurally sound, but on mobile it still reads as a large setup sheet rather than a short guided sequence.  
Recommendation: Break it into clearer sections with stronger step cues and tighter message zones.  
Suggested command: `$impeccable onboard /register`

**[P2] Portal shortcut vocabulary mixes internal web links with external-style chips**  
Location: [PortalHomeDashboard.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/portal/PortalHomeDashboard.tsx:24), [PortalHomeDashboard.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/portal/PortalHomeDashboard.tsx:156)  
Category: Product consistency  
Impact: Users see the same visual affordance used for links that behave differently, which weakens predictability.  
Recommendation: Split “stay in portal” actions from “open another surface” actions with clearer component roles.  
Suggested command: `$impeccable polish portal`

### P3

**[P3] Login/register forms lack stronger inline loading affordances**  
Location: [EmployeeCodeLoginForm.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/EmployeeCodeLoginForm.tsx:54), [RegisterForm.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/auth/RegisterForm.tsx:93)  
Category: Onboarding  
Impact: Disabled selects and delayed requirement checks work functionally, but they do not explain themselves strongly enough under slow mobile conditions.  
Recommendation: Add lightweight inline status copy or skeleton treatment.  
Suggested command: `$impeccable harden auth`

**[P3] Admin shell is structurally sound but could better separate navigation from action urgency**  
Location: [AdminShell.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/components/admin/AdminShell.tsx:25)  
Category: Layout  
Impact: The shell can support dense work, but without stronger visual distinction between global nav and task content, busy screens start to feel same-weight.  
Recommendation: Tighten neutral layering and emphasis hierarchy in the shell.  
Suggested command: `$impeccable layout admin`

**[P3] Mixed Thai/English naming on admin dashboards reduces polish**  
Location: [HrAdminDashboard.tsx](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/features/dashboard/HrAdminDashboard.tsx:34)  
Category: Clarify  
Impact: Code-mixed labels are understandable internally, but the interface feels less deliberate and less trustworthy than it could.  
Recommendation: Normalize label language per selected locale and per screen audience.  
Suggested command: `$impeccable clarify /admin`

## Patterns & Systemic Issues

- Web surfaces are split between two product assumptions: “browser portal” and “handoff into LIFF.” This is the biggest structural inconsistency.
- The design system exists, but direct color values and bespoke page styling still leak through on important surfaces.
- Admin pages have useful data and good task coverage, but dense-work readability is weakened by decorative framing.
- Auth flow logic is stronger than auth flow messaging. The code knows the states; the UI does not always explain them cleanly.

## Positive Findings

- Global tokens and base theming are already present in [globals.css](/Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/src/app/globals.css:1), so cleanup can reuse an existing foundation.
- Auth, portal, and admin surfaces already have distinct shells, which makes targeted UX refactoring easier.
- Attendance and settings pages contain the right operational data; the main issue is presentation and route clarity, not missing product capability.
- Multilingual infrastructure exists across the app, so remaining gaps are more about completeness than architecture.

## Recommended Actions

1. **[P1] `$impeccable clarify /login`**: make web entry routes obvious and reduce mascot-first ambiguity.
2. **[P1] `$impeccable shape portal`**: redesign employee web shortcuts so core actions no longer depend on LIFF assumptions.
3. **[P1] `$impeccable harden auth`**: finish locale-complete control labels and improve loading/error states on auth forms.
4. **[P2] `$impeccable distill /admin/attendance`**: simplify dense admin workspace framing and reduce decorative surface noise.
5. **[P2] `$impeccable layout /admin/settings`**: regroup settings by operator intent and strengthen hierarchy.
6. **[P2] `$impeccable polish`**: final pass once auth, portal, and admin structure are aligned.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `$impeccable audit` after fixes to see your score improve.
