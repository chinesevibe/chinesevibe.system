# Phase 4 Kickoff

**Date:** 2026-06-11  
**Theme:** Production Excellence & PRD Polish  
**Tasks:** T61–T75 (15) | Milestones M16–M20

## Why Phase 4

Phase 3 ส่ง features ครบแล้ว แต่ยังมี gap สำคัญ:

1. **Cron ยังไม่ลงทะเบียน** บน Supabase (weekly/monthly/scheduler)
2. **Dashboard** ยังมี stub data (recruitment donut, HR tickets)
3. **Reports** ยังไม่มี CSV export / date filter
4. **F5** alerts มีแล้ว แต่ยังไม่มี UI บันทึกผลทดลองงาน / ต่อวีซ่า
5. **Payroll / Performance / Recruitment / Training** ยังเป็น comingSoon

## Linear

- Phase 3 (JAK-101–JAK-115) → **Done** (sync ผ่าน Linear MCP 2026-06-11)
- Phase 4 → **JAK-116–JAK-130** (สร้างแล้ว, T61 = In Progress)

## First task

**T61** — pg_cron migration สำหรับ edge functions ทั้งหมด

Detail: `orchestration/PHASE_4_PLAN.md`
