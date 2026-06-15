# Phase 2 Kickoff — /goal phase2

**Date:** 2026-06-11  
**Orchestrator:** Cursor

## Status

| Layer | Status |
|-------|--------|
| **Orchestration** | ✅ READY — Taskmaster T31–T45, Linear JAK-86–100, milestones M7–M10 |
| **Implementation** | 🔴 NOT STARTED — F7/F8/F9 ยังเป็น guide stub + Coming Soon |

## Feature Readiness (honest)

| Feature | Code today | Target tasks |
|---------|------------|--------------|
| F7 Document Request | `documentAction()` → guide only; `/admin/documents` Coming Soon | T31–T34 |
| F8 Complaint | `complaintAction()` → guide only | T35–T38 |
| F9 Announcements | `announcementAction()` → guide only | T39–T42 |

## Verdict

🔴 **FEATURES NOT READY** — Phase 2 ยังไม่จบจนกว่า T31–T44 จะ implement + review  
✅ **TRACKING READY** — พร้อม dispatch Claude Code ทันที

## Active Task

**T31** — Document Request Schema (In Progress)  
Linear: [JAK-86](https://linear.app/jakarinosk/issue/JAK-86)

## Dispatch (copy to Claude Code)

```
อ่าน skills:
- orchestration/workflow-skills/10-security-review/SKILL.md
- Supabase skill

อ่าน:
- GROUND_TRUTH.md
- orchestration/CURRENT_TASK.md
- orchestration/PHASE_2_PLAN.md
- docs/PRD.md § F7

เริ่ม PLAN T31 — skill 03-claude-plan
```

## Linear Map

| Milestone | Issues | Tasks |
|-----------|--------|-------|
| M7 Document Request | JAK-86–89 | T31–T34 |
| M8 Complaint | JAK-90–93 | T35–T38 |
| M9 Announcements | JAK-94–97 | T39–T42 |
| M10 Hardening | JAK-99,98,100 | T43–T45 |

## ปิด Phase 2 จริงเมื่อไหร่

1. T31–T44 done + reviewed  
2. Cursor รัน `/goal` หรือ T45 → `DELIVERY_READINESS_AUDIT_P2.md` verdict 🟢/🟡  
3. Linear M7–M10 → CLOSED
