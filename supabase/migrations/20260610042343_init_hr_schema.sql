-- T02: HR Payroll Phase 1 schema
-- 5 tables (hr_ prefix) + indexes + updated_at triggers + RLS policies.
-- Auth bridge for T04 (LINE Login): policies reference SECURITY DEFINER helpers only;
-- the JWT must carry a `line_user_id` claim — change hr_line_user_id() if T04 picks
-- a different mapping. Server-side cron/webhook uses service_role and bypasses RLS.

-- ============================================================
-- Shared trigger function
-- ============================================================

create or replace function hr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tables
-- ============================================================

create table hr_employees (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  name text not null,
  position text,
  department text,
  salary numeric(12,2),
  contract_start date,
  probation_end date,
  visa_expiry date,
  work_permit_expiry date,
  role text not null default 'employee' check (role in ('employee', 'hr', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  check_in_location jsonb,
  is_late boolean not null default false,
  work_hours numeric(5,2),
  created_at timestamptz not null default now()
);

create table hr_leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references hr_employees(id),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table hr_leave_balances (
  employee_id uuid not null references hr_employees(id),
  leave_type text not null,
  total_days numeric(5,2) not null default 0,
  used_days numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (employee_id, leave_type)
);

create table hr_alerts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  alert_type text not null,
  trigger_date date not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index hr_employees_status_idx on hr_employees (status);
create index hr_attendance_employee_id_check_in_at_idx on hr_attendance (employee_id, check_in_at);
create index hr_leaves_employee_id_idx on hr_leaves (employee_id);
create index hr_leaves_status_idx on hr_leaves (status);
create index hr_alerts_employee_id_idx on hr_alerts (employee_id);
create index hr_alerts_status_idx on hr_alerts (status);
create index hr_alerts_trigger_date_idx on hr_alerts (trigger_date);

-- ============================================================
-- updated_at triggers
-- ============================================================

create trigger hr_employees_set_updated_at
  before update on hr_employees
  for each row execute function hr_set_updated_at();

create trigger hr_leaves_set_updated_at
  before update on hr_leaves
  for each row execute function hr_set_updated_at();

create trigger hr_leave_balances_set_updated_at
  before update on hr_leave_balances
  for each row execute function hr_set_updated_at();

-- ============================================================
-- Auth helper functions (T04 wiring point)
-- ============================================================

create or replace function hr_line_user_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'line_user_id', '')
$$;

-- SECURITY DEFINER: avoids RLS recursion when hr_employees policies look up the caller.
create or replace function hr_employee_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from hr_employees where line_user_id = hr_line_user_id()
$$;

-- Role comes from hr_employees (single source of truth), not a JWT claim.
create or replace function hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from hr_employees
    where line_user_id = hr_line_user_id() and role in ('hr', 'admin')
  )
$$;

revoke execute on function hr_line_user_id() from public, anon;
revoke execute on function hr_employee_id() from public, anon;
revoke execute on function hr_is_hr_admin() from public, anon;
grant execute on function hr_line_user_id() to authenticated, service_role;
grant execute on function hr_employee_id() to authenticated, service_role;
grant execute on function hr_is_hr_admin() to authenticated, service_role;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table hr_employees enable row level security;
alter table hr_attendance enable row level security;
alter table hr_leaves enable row level security;
alter table hr_leave_balances enable row level security;
alter table hr_alerts enable row level security;

-- hr_employees: employee reads own row; hr/admin full access
create policy "employees select self or hr" on hr_employees
  for select to authenticated
  using (id = hr_employee_id() or hr_is_hr_admin());

create policy "employees insert hr only" on hr_employees
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "employees update hr only" on hr_employees
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "employees delete hr only" on hr_employees
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_attendance: employee reads/writes own rows (check-in/check-out); hr/admin full access
create policy "attendance select self or hr" on hr_attendance
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance insert self or hr" on hr_attendance
  for insert to authenticated
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance update self or hr" on hr_attendance
  for update to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin())
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance delete hr only" on hr_attendance
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_leaves: employee reads own + submits own; only hr/admin update (approve/reject) or delete
create policy "leaves select self or hr" on hr_leaves
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leaves insert self or hr" on hr_leaves
  for insert to authenticated
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leaves update hr only" on hr_leaves
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "leaves delete hr only" on hr_leaves
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_leave_balances: employee reads own balance; hr/admin manage
create policy "leave_balances select self or hr" on hr_leave_balances
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leave_balances insert hr only" on hr_leave_balances
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "leave_balances update hr only" on hr_leave_balances
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "leave_balances delete hr only" on hr_leave_balances
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_alerts: cron (service_role, bypasses RLS) writes; hr/admin manage; employees no access
create policy "alerts select hr only" on hr_alerts
  for select to authenticated
  using (hr_is_hr_admin());

create policy "alerts insert hr only" on hr_alerts
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "alerts update hr only" on hr_alerts
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "alerts delete hr only" on hr_alerts
  for delete to authenticated
  using (hr_is_hr_admin());
