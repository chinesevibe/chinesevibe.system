# Delivery Readiness Audit — Phase 2

**Date:** 2026-06-11 (UAT updated)  
**Verdict:** 🟢 **READY** (1:1 LINE) / 🟡 group HR caveat  
**Production:** https://hr-app-two-iota.vercel.app

## Build Gates

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (1 pre-existing warning in LeaveForm) |
| E2E P2 (`run-all-p2.mjs`) | Skipped locally (env → localhost); migration applied prod |
| **Manual UAT (LINE 1:1)** | **PASS** — 2026-06-11 ChineseVibe OA |

## Feature Matrix (PRD F7–F9)

| Feature | Status | Evidence |
|---------|--------|----------|
| F7 Document Request (LINE/LIFF) | ✅ | `/liff/documents`, `/api/documents/request` |
| F7 Admin document queue | ✅ | `/admin/documents` |
| F8 Complaint (LINE/LIFF) | ✅ | `/liff/complaint`, `/api/complaints/submit` |
| F8 Admin complaints + reply | ✅ | `/admin/complaints`, `/api/complaints/[id]/reply` |
| F9 Announcements admin + broadcast | ✅ | `/admin/announcements`, `/api/announcements` |
| F9 LINE view announcements | ✅ | `announcementAction` → recent sent list |

## Critical Issues

None (build passes).

## Manual UAT Evidence (2026-06-11)

| Flow | Result | Notes |
|------|--------|-------|
| F7 ขอเอกสาร → HR notify | ✅ | Flex คำขอเอกสารใหม่ + ปุ่มเปิดคิว; หนังสือรับรองการทำงาน |
| F8 ร้องเรียน (นิรนาม) | ✅ | Ticket `HR-9UZ3PN`, Flex ยืนยัน + HR notify |
| F8 ฟอร์ม LIFF | ✅ | เปิดแบบฟอร์มจาก Rich Menu ได้ |
| HR group chat | ⚠️ | ยังได้ auto-reply จาก LINE OA Manager (ไม่ใช่ bug แอป) |

## Minor / Caveats

1. ~~Migration~~ — applied prod (`20260611190000_phase2_support_features.sql`).
2. **HR group** — ปิด auto-response ใน [LINE OA Manager](https://manager.line.biz/) → Response settings → Webhook; กลุ่มใช้ push-only (`notifyHr`). ดู `scripts/line-oa-response-check.mjs`.
3. **Anonymous complaints** — HR ได้ notify; ผู้แจ้งนิรนามไม่ได้รับ reply ทาง LINE (by design).
4. **E2E P2** — รันกับ remote Supabase ได้หลังตั้ง `.env.local` ชี้ production.

## Demo Path (Phase 2)

1. LINE → ขอเอกสาร → เปิดฟอร์ม → ส่งคำขอ  
2. Admin → Documents → advance status → employee LINE notification  
3. LINE → ร้องเรียน → ส่งเรื่อง → Admin Complaints → ตอบกลับ  
4. Admin → Announcements → ส่งประกาศ → LINE → ประกาศ (recent list)

## User Actions Before Client Demo

- [x] Migration + deploy + `NEXT_PUBLIC_BASE_URL`
- [x] Manual UAT 1:1 (F7 + F8)
- [ ] ปิด LINE OA auto-reply ในกลุ่ม HR (optional สำหรับ demo 1:1)
- [ ] ทดสอบ F9 ประกาศ broadcast (ถ้ายังไม่ลอง)

## Recommendation

**Client demo พร้อม** สำหรับ flow 1:1 (ขอเอกสาร + ร้องเรียน + admin queue). แจ้งลูกค้าเรื่องกลุ่ม HR เป็น known config ถ้าใช้ group notify.
