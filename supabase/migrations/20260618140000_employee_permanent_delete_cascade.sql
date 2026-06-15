-- Permanent employee delete: cascade child rows and allow HR to purge compliance/blacklist notes.

-- Core attendance / leave / alert rows should cascade when HR deletes an employee.
alter table public.hr_attendance
  drop constraint if exists hr_attendance_employee_id_fkey;

alter table public.hr_attendance
  add constraint hr_attendance_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_employee_id_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_approved_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_approved_by_fkey
  foreign key (approved_by) references public.hr_employees (id) on delete set null;

alter table public.hr_leave_balances
  drop constraint if exists hr_leave_balances_employee_id_fkey;

alter table public.hr_leave_balances
  add constraint hr_leave_balances_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_alerts
  drop constraint if exists hr_alerts_employee_id_fkey;

alter table public.hr_alerts
  add constraint hr_alerts_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

-- HR complaint replies authored by the deleted employee (e.g. HR staff) must not block delete.
alter table public.hr_complaint_replies
  drop constraint if exists hr_complaint_replies_author_employee_id_fkey;

alter table public.hr_complaint_replies
  add constraint hr_complaint_replies_author_employee_id_fkey
  foreign key (author_employee_id) references public.hr_employees (id) on delete cascade;

-- Approval audit columns on other employees' rows should clear, not block delete.
alter table public.hr_leaves
  drop constraint if exists hr_leaves_manager_decided_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_hr_decided_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_manager_decided_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_hr_decided_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_submitted_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_submitted_by_fkey
  foreign key (submitted_by) references public.hr_employees (id) on delete set null;

alter table public.hr_attendance_submissions
  drop constraint if exists hr_attendance_submissions_manager_decided_by_fkey;

alter table public.hr_attendance_submissions
  add constraint hr_attendance_submissions_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_attendance_submissions
  drop constraint if exists hr_attendance_submissions_hr_decided_by_fkey;

alter table public.hr_attendance_submissions
  add constraint hr_attendance_submissions_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

-- RLS: cascaded deletes on compliance notes (incl. Leave Blacklist) require an HR delete policy.
drop policy if exists hr_compliance_notes_delete on public.hr_compliance_notes;

create policy hr_compliance_notes_delete on public.hr_compliance_notes
  for delete using (hr_is_hr_admin());

drop policy if exists hr_complaint_replies_delete on public.hr_complaint_replies;

create policy hr_complaint_replies_delete on public.hr_complaint_replies
  for delete using (hr_is_hr_admin());
