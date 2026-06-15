-- BM approval step removed: move legacy pending_manager rows to HR queue.
update public.hr_attendance_submissions
  set approval_status = 'pending_hr'
  where approval_status = 'pending_manager';

update public.hr_leaves
  set approval_status = 'pending_hr'
  where approval_status = 'pending_manager';

update public.hr_overtime_requests
  set approval_status = 'pending_hr'
  where approval_status = 'pending_manager';
