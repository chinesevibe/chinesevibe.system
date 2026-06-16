# Live Location Tracking — Product Spec (Shift-bound)

**Status:** Scoped — awaiting PLAN (T154)  
**Confirmed by client:** 2026-06-15  
**App:** CNV WorkHub — `hr-app/`

---

## Decision (locked)

| Rule | Detail |
|------|--------|
| **When tracking runs** | Only while employee has an **open shift** (checked in, not yet checked out) |
| **When tracking stops** | Immediately on **check-out** (success) — no further pings accepted or stored |
| **LINE messages** | **No** push to employee on every GPS ping — silent HTTP posts from LIFF only |
| **LINE messages (allowed)** | One-time at shift start: open LIFF tracker / consent; optional summary at check-out (existing flow) |
| **Outside shift** | Server **rejects** location pings if no open `hr_attendance` row for today |

This is **not** 24/7 surveillance — it is **shift-scoped attendance location**.

---

## Current system (baseline)

- Check-in stores **one** point: `hr_attendance.check_in_location` (lat, lng, address)
- Check-out validates geofence but **does not** store `check_out_location`
- Admin attendance table shows times only — **no map**
- Branch geofence: `hr_branches` + `assertWithinBranchGeofence()` (~200 m default)

---

## Proposed MVP (T154)

### Employee (LIFF)

1. After successful check-in → offer **“เปิดการติดตามตำแหน่งระหว่างงาน”** (or auto-open LIFF tracker page)
2. LIFF page `/liff/shift-tracker` (name TBD):
   - Shows shift status: checked in since {time}
   - Uses `navigator.geolocation.watchPosition` or interval `getCurrentPosition` every **3–5 minutes**
   - POST `/api/attendance/location-ping` with `{ latitude, longitude, accuracy_m?, recorded_at? }`
   - **Must keep page open** (LINE in-app browser) — document iOS limitation in manual
3. On check-out (LINE or portal) → backend sets `check_out_at` → **ping API returns 409 / shift_closed** → LIFF stops watcher

### Backend

- New table `hr_location_pings`:
  - `id`, `employee_id`, `attendance_id` (FK → open shift), `latitude`, `longitude`, `accuracy_m`, `recorded_at`, `created_at`
- Index: `(attendance_id, recorded_at DESC)`, `(employee_id, recorded_at DESC)`
- RLS: employee insert/select own; HR/admin select all (branch-scoped if applicable)
- Ping handler:
  1. Resolve employee from LINE session / LIFF token
  2. Find **today’s open** attendance (`check_out_at IS NULL`)
  3. If none → **403 shift_not_open**
  4. If `check_out_at` set between read and write → reject
  5. Insert ping (rate limit e.g. 1/min per employee)
- Optional: on check-out hook — no delete of pings; retention job later (90 days)

### Admin (Web)

- Page or panel: **Live map** (Leaflet/OSM first — matches `BranchLocationEditor`; Google Maps optional later)
- Show: branch pin + geofence circle + employees with **open shift** (last ping + trail for today’s `attendance_id`)
- Refresh: Supabase Realtime on `hr_location_pings` or poll 30s
- Historical: click attendance row → path for that shift only

### i18n

- Keys in `messages.ts` + `zh-employee.ts` / `my-employee.ts` for tracker UI and consent copy
- PDPA/consent line: tracking only during active shift

---

## Explicit non-goals (MVP)

- Native iOS/Android background GPS
- LINE push every N minutes asking to share location
- Tracking after check-out or on days off
- New npm deps without approval (prefer Leaflet if map lib needed)

---

## Acceptance criteria (T154)

- [ ] Ping API rejects when not checked in or already checked out
- [ ] Pings stop being stored after check-out (verified E2E)
- [ ] No LINE chat message sent per ping
- [ ] Admin can see last known position for in-progress shifts on a map
- [ ] `npm run build`, `typecheck`, `lint` pass
- [ ] Work log + employee manual updated (shift-only tracking + keep LIFF open)

---

## Suggested task split

| ID | Phase | Agent | Scope |
|----|-------|-------|--------|
| **T154** | PLAN | Claude Code | Schema, API contract, LIFF UX, admin map wireframe, i18n keys list |
| **T154a** | EXECUTE | Claude Code | Migration + RLS + ping API + check-out guard |
| **T154b** | EXECUTE | Codex | LIFF shift-tracker page (UI + geolocation loop) |
| **T154c** | EXECUTE | Codex | Admin live map component |

**Queue after:** T151 (i18n) → T152/T153 → T150 → **T154 PLAN**

---

## Platform limits (document for users)

- **iPhone:** tracking pauses if employee closes LIFF or switches away for long periods
- **Android:** somewhat more tolerant but same LIFF constraint
- For true background tracking → future native app (out of scope per GROUND_TRUTH)

---

*Orchestrator: Cursor — 2026-06-15*
