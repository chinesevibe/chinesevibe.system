<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent Discipline — hr-payroll-client (2026-06-20)

> Global ruleset + Ponytail mindset: `/Users/jakarinosk/HEAD-OFFICE/AGENTS.md`  
> Routing + team config: `GROUND_TRUTH.md` §6 + `orchestration/CURRENT_TASK.md`

---

## Claude Code — HR ERP OPS Expert (Lead)

**บทบาท:** วินิจฉัยปัญหา · วางแผน · spawn subagents · review output · QA gate · approve commit

ทีมทั้งหมดเป็น Claude Code native agents:

| Subagent | Type | ใช้เมื่อ |
|----------|------|---------|
| **Scout** | `Explore` | ต้องการค้นหาไฟล์เร็ว / grep pattern / locate bug source โดยไม่เปลืองบน context |
| **Architect** | `Plan` | งาน multi-file, schema change, API contract, flow ที่ต้องออกแบบก่อน implement |
| **Implementer** | `general-purpose` | ลง code จริง — fixes, API routes, migrations, components, tests |

### Diagnose-First Protocol

```
ก่อน implement ทุกครั้ง:
1. Scout → ค้นหา file map + root cause (grep / file read)
2. ระบุ expected vs actual behavior + สาเหตุจริง
3. วางแผน minimum fix list
4. Dispatch พร้อม file list + spec ที่ชัดเจน
```

### ห้าม:
- ❌ dispatch โดยไม่ Scout ก่อน (ห้าม assume)
- ❌ approve งานที่ยัง fail QA gate
- ❌ implement payroll baht / inventory ใน session นี้

---

## Scout (Explore subagent)

**ใช้:** ค้นหาไฟล์ด้วย pattern · grep symbols/strings · ตอบ "ไฟล์นี้อยู่ที่ไหน / function นี้ define ที่ไหน"

**ไม่ใช้:** code review · cross-file analysis ลึก · open-ended design questions

**Breadth:** ระบุเมื่อ spawn — `quick` / `medium` / `very thorough`

---

## Architect (Plan subagent)

**ใช้:** ออกแบบ solution ก่อน implement — migration plan, API design, multi-file refactor approach

**Output:** step-by-step plan + file list + trade-off notes → Lead อนุมัติก่อน dispatch Implementer

---

## Implementer (general-purpose subagent)

**รับงาน:** implement ตาม plan ที่ Lead/Architect อนุมัติแล้วเท่านั้น

**Protocol:**
- อ่าน file list ที่ dispatch กำหนด — ไม่แตะนอก scope
- **Before fix:** expected vs actual → min fix (with evidence จากโค้ดจริง)
- **After fix:** รายงาน files changed + reason + risk + test command
- เขียนน้อยที่สุดที่ยังถูกต้อง (Ponytail)
- ห้าม refactor นอก scope · ห้าม add feature ที่ไม่ได้ assign

**QA ก่อนหยุด:**
```bash
npm run build       # 0 errors
npm run typecheck   # 0 errors  
npm run lint        # 0 errors
npm test            # ถ้ามี test file ที่เกี่ยวข้อง
```

**หยุดเมื่อ:** implement ครบตาม spec → เขียน `_agent/TASK_RESULT.md` → STOP ✋

---

## QA Gate (Lead เป็น gatekeeper — ทุก task ต้องผ่านก่อน commit)

```bash
npm run build && npm run typecheck && npm run lint
# ถ้ามี test files ที่เกี่ยวข้อง:
npm test
```

Lead ไม่ approve ถ้า QA ยังไม่ผ่าน — แม้ logic ถูกก็ตาม

---

## HR File Map (สำหรับ Scout + diagnosis)

| หัวข้อ HR | ไฟล์หลัก |
|-----------|---------|
| Employee list + data | `src/features/employees/data.ts` · `EmployeeTable.tsx` |
| Employee profile | `src/features/employees/profile/` · `src/app/api/employees/[id]/` |
| Attendance roster (today) | `src/lib/attendance/daily-roster.ts` · `AttendanceTodayRoster.tsx` |
| Attendance history | `src/features/attendance/data.ts` · `AttendanceTable.tsx` |
| Check-in / Check-out | `src/lib/attendance/check-in.ts` · `check-out.ts` · `src/app/api/clock/` |
| Paid work hours | `src/lib/attendance/paid-work-time.ts` |
| Late detection | `src/lib/attendance/late.ts` |
| Off days | `src/lib/employees/off-days.ts` |
| Leave request + approval | `src/lib/approval/leave-decide.ts` · `src/app/api/leave/` |
| Overtime 2-tier | `src/lib/approval/overtime-decide.ts` · `src/app/api/overtime/` |
| Work shifts | `src/features/shifts/` · `src/lib/attendance/retro-limit.ts` |
| Auth + roles | `src/lib/auth/roles.ts` · `session.ts` · `require-role.ts` |
| LINE webhook | `src/app/api/line/webhook/route.ts` · `src/lib/line/handlers/` |
| LIFF pages | `src/app/liff/` |
| Admin pages | `src/app/admin/` |
| Edge Functions / cron | `supabase/functions/` |
| Settings / morning-push | `src/features/settings/` · `src/lib/settings/morning-push-config.ts` |
| DB types (generated) | `src/types/database.ts` |
| Supabase client | `src/lib/supabase/server.ts` · `client.ts` |
| Payroll hours (not baht) | `src/lib/payroll/aggregate.ts` · `calculate.ts` |

---

## HR System Patterns (สำหรับ diagnose ให้แม่น)

```
Auth flow:   LINE login → JWT (line_user_id claim) → hr_employees row → role/status check
LIFF flow:   LINE LIFF init → getCurrentEmployee() → render by role/status
Approval:    employee submit → pending_hr → HR decide → notify LINE
Attendance:  clock-in API → check-in.ts → insert hr_attendance → compute paid hours
Cron:        Supabase Edge Function → pg_cron trigger → LINE Messaging API push
```

---

*อ่านร่วมกับ `GROUND_TRUTH.md` §6 เสมอ — agent team config อยู่ที่นั่น*
