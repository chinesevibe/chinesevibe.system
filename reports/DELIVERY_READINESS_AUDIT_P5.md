# Delivery Readiness Audit — Phase 5

**Date:** 2026-06-10  
**Verdict:** READY FOR CLIENT REVIEW (MVP)

## Delivered

| Requirement | Status |
|-------------|--------|
| สาขา > แผนก | ✅ `hr_branches` + `hr_departments.branch_id` |
| BM 1:1 สาขา | ✅ unique `manager_employee_id` |
| อนุมัติ 2 ขั้น (ลา, เข้างาน) | ✅ BM → HR |
| 48 ชม. SLA | ✅ `expires_at` + `approval-expiry` fn |
| ลาป่วยย้อนหลัง ≤3 วัน + ใบรับรอง | ✅ API validation |
| ลาป่วยรายชม. | ✅ `leave_unit=hours` |
| OT โดย BM | ✅ `/admin/manager/overtime` |
| Payroll ชม. | ✅ ledger + `/admin/payroll` report |

## Phase 5.1 (in progress — manager setup deferred)

- ✅ LINE ปุ่ม "ยื่นสรุปวัน" หลัง check-out (`submit_attendance`)
- ✅ `/liff/attendance` — ยื่นสรุปวันผ่านเว็บ
- ✅ UI สร้างสาขา (manager มอบหมายทีหลังได้)
- ✅ Leave form: ลาป่วยรายชม. + ข้อความย้อนหลัง 3 วัน
- ⏳ มอบหมาย Branch Manager (client จะตั้งทีหลัง)
- ⏳ LINE push แจ้งคิว manager
- ⏳ Register `approval-expiry` cron ใน vault
