-- Head Office (branch code 000) — office staff; no geofence for check-in/out
update public.hr_branches
set geofence_enabled = false
where code = '000';

comment on column public.hr_branches.geofence_enabled is
  'เปิด geofence สำหรับเช็คอิน/ออก — Head Office (000) ไม่ใช้';
