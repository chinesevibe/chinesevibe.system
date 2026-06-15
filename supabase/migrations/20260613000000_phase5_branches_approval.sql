-- Phase 5: branches, branch_manager role, two-tier approval, payroll hours ledger

-- ============================================================
-- Branches
-- ============================================================

create table if not exists public.hr_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  manager_employee_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hr_branches_set_updated_at
  before update on public.hr_branches
  for each row execute function public.hr_set_updated_at();

-- Default branch for data migration
insert into public.hr_branches (name, code)
values ('สาขาหลัก', 'MAIN')
on conflict (code) do nothing;

-- ============================================================
-- Departments under branch
-- ============================================================

alter table public.hr_departments
  add column if not exists branch_id uuid references public.hr_branches (id) on delete restrict;

update public.hr_departments d
set branch_id = b.id
from public.hr_branches b
where b.code = 'MAIN' and d.branch_id is null;

alter table public.hr_departments drop constraint if exists hr_departments_name_key;

create unique index if not exists hr_departments_branch_name_uidx
  on public.hr_departments (branch_id, name)
  where branch_id is not null;

-- Seed departments from employee text column
insert into public.hr_departments (name, branch_id)
select distinct e.department, b.id
from public.hr_employees e
cross join public.hr_branches b
where b.code = 'MAIN'
  and e.department is not null
  and trim(e.department) <> ''
  and not exists (
    select 1 from public.hr_departments d
    where d.branch_id = b.id and d.name = e.department
  );

-- ============================================================
-- Employees: branch + department FK, branch_manager role
-- ============================================================

alter table public.hr_employees
  add column if not exists branch_id uuid references public.hr_branches (id) on delete set null,
  add column if not exists department_id uuid references public.hr_departments (id) on delete set null;

update public.hr_employees e
set branch_id = b.id
from public.hr_branches b
where b.code = 'MAIN' and e.branch_id is null;

update public.hr_employees e
set department_id = d.id
from public.hr_departments d
where e.department is not null
  and d.name = e.department
  and d.branch_id = e.branch_id
  and e.department_id is null;

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees
  add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager'));

alter table public.hr_branches
  drop constraint if exists hr_branches_manager_employee_id_fkey;
alter table public.hr_branches
  add constraint hr_branches_manager_employee_id_fkey
  foreign key (manager_employee_id) references public.hr_employees (id) on delete set null;

create index if not exists hr_employees_branch_id_idx on public.hr_employees (branch_id);
create index if not exists hr_departments_branch_id_idx on public.hr_departments (branch_id);

-- ============================================================
-- Auth helpers
-- ============================================================

create or replace function public.hr_is_branch_manager()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'branch_manager'
  )
$$;

create or replace function public.hr_managed_branch_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select b.id
  from public.hr_branches b
  join public.hr_employees e on e.id = b.manager_employee_id
  where e.line_user_id = hr_line_user_id()
  limit 1
$$;

create or replace function public.hr_employee_branch_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select branch_id from public.hr_employees where id = hr_employee_id()
$$;

create or replace function public.hr_can_access_branch(p_branch_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin()
    or (hr_is_branch_manager() and hr_managed_branch_id() = p_branch_id)
$$;

grant execute on function public.hr_is_branch_manager() to authenticated, service_role;
grant execute on function public.hr_managed_branch_id() to authenticated, service_role;
grant execute on function public.hr_employee_branch_id() to authenticated, service_role;
grant execute on function public.hr_can_access_branch(uuid) to authenticated, service_role;

-- ============================================================
-- Attendance submissions (daily approval)
-- ============================================================

create table if not exists public.hr_attendance_submissions (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null unique references public.hr_attendance (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  work_date date not null,
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approval_status text not null default 'pending_manager'
    check (approval_status in ('pending_manager', 'pending_hr', 'approved', 'rejected', 'expired')),
  manager_decided_by uuid references public.hr_employees (id),
  manager_decided_at timestamptz,
  hr_decided_by uuid references public.hr_employees (id),
  hr_decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create index if not exists hr_attendance_submissions_status_idx
  on public.hr_attendance_submissions (approval_status);
create index if not exists hr_attendance_submissions_employee_idx
  on public.hr_attendance_submissions (employee_id);

alter table public.hr_attendance_submissions enable row level security;

create policy hr_att_sub_select on public.hr_attendance_submissions
  for select using (
    employee_id = hr_employee_id()
    or hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

create policy hr_att_sub_insert on public.hr_attendance_submissions
  for insert with check (employee_id = hr_employee_id());

create policy hr_att_sub_update on public.hr_attendance_submissions
  for update using (
    hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

-- ============================================================
-- Leaves: two-tier approval + hourly sick + retro rules
-- ============================================================

alter table public.hr_leaves
  add column if not exists leave_unit text not null default 'days'
    check (leave_unit in ('days', 'hours')),
  add column if not exists leave_hours numeric(5,2),
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists approval_status text not null default 'pending_manager'
    check (approval_status in ('pending_manager', 'pending_hr', 'approved', 'rejected', 'expired')),
  add column if not exists manager_decided_by uuid references public.hr_employees (id),
  add column if not exists manager_decided_at timestamptz,
  add column if not exists hr_decided_by uuid references public.hr_employees (id),
  add column if not exists hr_decided_at timestamptz,
  add column if not exists medical_certificate_url text;

update public.hr_leaves
set approval_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'pending_manager'
end,
expires_at = coalesce(submitted_at, created_at) + interval '48 hours'
where expires_at is null;

-- ============================================================
-- Overtime: BM submits → pending_hr
-- ============================================================

alter table public.hr_overtime_requests
  add column if not exists submitted_by uuid references public.hr_employees (id),
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists approval_status text not null default 'pending_hr'
    check (approval_status in ('pending_hr', 'approved', 'rejected')),
  add column if not exists hr_decided_by uuid references public.hr_employees (id),
  add column if not exists hr_decided_at timestamptz;

update public.hr_overtime_requests
set approval_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'pending_hr'
end
where approval_status = 'pending_hr' and status <> 'pending';

drop policy if exists hr_overtime_insert on public.hr_overtime_requests;
create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (
    hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_select on public.hr_overtime_requests;
create policy hr_overtime_select on public.hr_overtime_requests
  for select using (
    employee_id = hr_employee_id()
    or hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_update on public.hr_overtime_requests;
create policy hr_overtime_update on public.hr_overtime_requests
  for update using (hr_is_hr_admin());

-- ============================================================
-- Payroll hours ledger
-- ============================================================

create table if not exists public.hr_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  branch_id uuid references public.hr_branches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (year, month, branch_id)
);

create table if not exists public.hr_payroll_hour_lines (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.hr_payroll_periods (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  line_type text not null check (line_type in ('regular', 'overtime', 'sick_hourly')),
  hours numeric(8,2) not null,
  work_date date not null,
  source_type text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists hr_payroll_hour_lines_period_idx on public.hr_payroll_hour_lines (period_id);

alter table public.hr_payroll_periods enable row level security;
alter table public.hr_payroll_hour_lines enable row level security;

create policy hr_payroll_periods_hr on public.hr_payroll_periods
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_payroll_lines_hr on public.hr_payroll_hour_lines
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- ============================================================
-- Branch RLS
-- ============================================================

alter table public.hr_branches enable row level security;

create policy hr_branches_select on public.hr_branches
  for select using (
    hr_is_hr_admin()
    or hr_is_branch_manager()
    or hr_employee_id() is not null
  );

create policy hr_branches_write on public.hr_branches
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_departments_select on public.hr_departments;
create policy hr_departments_select on public.hr_departments
  for select using (hr_is_hr_admin() or hr_employee_id() is not null or hr_is_branch_manager());

-- Leaves: manager can update pending_manager in their branch
drop policy if exists "leaves update hr only" on public.hr_leaves;
create policy hr_leaves_update on public.hr_leaves
  for update using (
    hr_is_hr_admin()
    or (
      hr_is_branch_manager()
      and approval_status = 'pending_manager'
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  );
