-- OT 2-tier approval: employee → branch manager → HR

alter table public.hr_overtime_requests
  add column if not exists manager_decided_by uuid references public.hr_employees (id),
  add column if not exists manager_decided_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_approval_status_check;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_approval_status_check
  check (
    approval_status in (
      'pending_manager',
      'pending_hr',
      'approved',
      'rejected',
      'expired'
    )
  );

update public.hr_overtime_requests
set expires_at = coalesce(submitted_at, created_at) + interval '48 hours'
where expires_at is null
  and approval_status in ('pending_manager', 'pending_hr');

drop policy if exists hr_overtime_insert on public.hr_overtime_requests;
create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (
    hr_is_hr_admin()
    or employee_id = hr_employee_id()
    or (
      hr_is_branch_manager()
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  );

drop policy if exists hr_overtime_update on public.hr_overtime_requests;
create policy hr_overtime_update on public.hr_overtime_requests
  for update using (
    hr_is_hr_admin()
    or (
      hr_is_branch_manager()
      and approval_status = 'pending_manager'
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  )
  with check (true);
