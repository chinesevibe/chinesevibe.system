-- Attendance normalization draft
-- Project: hr-app / Supabase prod
-- Scope:
--   1) Fix completed attendance rows stored with work_hours = 0
--   2) Normalize approved attendance submissions so work_date matches shift_date
--
-- IMPORTANT:
--   This file is a draft only. Do not run against production until the DB-write gate is approved.

begin;

-- 3 completed rows were persisted with work_hours = 0.
update public.hr_attendance
set work_hours = case id
  when '38807fb7-1c8e-4b0c-a4ca-aeaf783b0ad6' then 12.00
  when '7ec51922-dd9d-4220-90d5-d330814e06a6' then 12.00
  when '4e6d9c39-0e00-4849-b624-795fd52ed940' then 12.00
  else work_hours
end
where id in (
  '38807fb7-1c8e-4b0c-a4ca-aeaf783b0ad6',
  '7ec51922-dd9d-4220-90d5-d330814e06a6',
  '4e6d9c39-0e00-4849-b624-795fd52ed940'
);

-- 14 approved submissions were recorded under the next ICT day.
-- Canonical runtime uses shift_date for overnight shift workDate, so normalize back to 2026-06-18.
with fixes(attendance_id, work_date) as (
  values
    ('bceae795-3962-4cc2-a942-081eec129c04', date '2026-06-18'),
    ('560d9216-7f2f-40b7-a38b-0ab4532ea841', date '2026-06-18'),
    ('c0c38961-071b-4d00-88ab-6138562bb8ec', date '2026-06-18'),
    ('818d4fc1-f6d4-4240-83e2-96e1ab8a40e2', date '2026-06-18'),
    ('1d209e71-8d10-4905-8b62-fde1b52a1e3a', date '2026-06-18'),
    ('39ddae58-ad93-417e-b93d-b05f68f54736', date '2026-06-18'),
    ('5fb7ca05-33ba-4d67-bb74-af483b5e942b', date '2026-06-18'),
    ('06706409-610c-4397-8029-062b607e1dc3', date '2026-06-18'),
    ('95ca675a-611e-4c51-a5f3-af1bc0e9f46b', date '2026-06-18'),
    ('94fb8fae-c9a2-4c4f-9572-158c6b596394', date '2026-06-18'),
    ('3f5a3e48-7190-4637-9e88-626964df183d', date '2026-06-18'),
    ('c533eaae-2aec-4470-844e-be64469e4a55', date '2026-06-18'),
    ('46c46b7c-8c73-472f-922e-c695be8de642', date '2026-06-18'),
    ('7ec51922-dd9d-4220-90d5-d330814e06a6', date '2026-06-18')
)
update public.hr_attendance_submissions s
set work_date = f.work_date
from fixes f
where s.attendance_id = f.attendance_id
  and s.work_date is distinct from f.work_date;

commit;

-- Open anomaly left out of this draft:
--   attendance_id = 4e6d9c39-0e00-4849-b624-795fd52ed940 (CNV043 / XINQI QIN)
--   has check_out_at but no hr_attendance_submissions row.
--   Insert it only if you want to replay finalization + payroll ledger intentionally.
