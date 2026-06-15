-- CEO role: executive read-only company dashboard (separate from hr/admin)

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager', 'ceo'));

create or replace function public.hr_is_ceo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'ceo'
  )
$$;

create or replace function public.hr_can_read_company()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin() or hr_is_ceo()
$$;

grant execute on function public.hr_is_ceo() to authenticated, service_role;
grant execute on function public.hr_can_read_company() to authenticated, service_role;

-- Read policies for CEO dashboard aggregates
drop policy if exists "employees select self or hr" on public.hr_employees;
create policy "employees select self or hr" on public.hr_employees
  for select to authenticated
  using (id = hr_employee_id() or hr_can_read_company());

drop policy if exists "attendance select self or hr" on public.hr_attendance;
create policy "attendance select self or hr" on public.hr_attendance
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_can_read_company());

drop policy if exists "leaves select self or hr" on public.hr_leaves;
create policy "leaves select self or hr" on public.hr_leaves
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_can_read_company());

drop policy if exists hr_att_sub_select on public.hr_attendance_submissions;
create policy hr_att_sub_select on public.hr_attendance_submissions
  for select using (
    employee_id = hr_employee_id()
    or hr_can_read_company()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_select on public.hr_overtime_requests;
create policy hr_overtime_select on public.hr_overtime_requests
  for select using (
    employee_id = hr_employee_id()
    or hr_can_read_company()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_branches_select on public.hr_branches;
create policy hr_branches_select on public.hr_branches
  for select using (
    hr_can_read_company()
    or hr_is_branch_manager()
    or hr_employee_id() is not null
  );

drop policy if exists hr_payroll_periods_hr on public.hr_payroll_periods;
create policy hr_payroll_periods_select on public.hr_payroll_periods
  for select using (hr_can_read_company());
create policy hr_payroll_periods_write on public.hr_payroll_periods
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_payroll_lines_hr on public.hr_payroll_hour_lines;
create policy hr_payroll_lines_select on public.hr_payroll_hour_lines
  for select using (hr_can_read_company());
create policy hr_payroll_lines_write on public.hr_payroll_hour_lines
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_announcements_select on public.hr_announcements;
create policy hr_announcements_select on public.hr_announcements
  for select using (hr_can_read_company() or status = 'sent');

drop policy if exists hr_departments_select on public.hr_departments;
create policy hr_departments_select on public.hr_departments
  for select using (
    hr_can_read_company()
    or hr_employee_id() is not null
    or hr_is_branch_manager()
  );
