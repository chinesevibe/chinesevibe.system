-- Phase 3: F10 OT, departments, scheduled announcements

-- F10: Overtime requests
create table if not exists public.hr_overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_overtime_end_after_start check (end_time > start_time)
);

create index if not exists hr_overtime_requests_employee_id_idx on public.hr_overtime_requests (employee_id);
create index if not exists hr_overtime_requests_status_idx on public.hr_overtime_requests (status);

drop trigger if exists hr_overtime_requests_updated_at on public.hr_overtime_requests;
create trigger hr_overtime_requests_updated_at
  before update on public.hr_overtime_requests
  for each row execute function public.hr_set_updated_at();

alter table public.hr_overtime_requests enable row level security;

create policy hr_overtime_select on public.hr_overtime_requests
  for select using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (employee_id = hr_employee_id());

create policy hr_overtime_update on public.hr_overtime_requests
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- Organization: departments master
create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.hr_departments enable row level security;

create policy hr_departments_select on public.hr_departments
  for select using (hr_is_hr_admin() or hr_employee_id() is not null);

create policy hr_departments_insert on public.hr_departments
  for insert with check (hr_is_hr_admin());

create policy hr_departments_update on public.hr_departments
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_departments_delete on public.hr_departments
  for delete using (hr_is_hr_admin());

-- Scheduled announcements
alter table public.hr_announcements
  drop constraint if exists hr_announcements_status_check;

alter table public.hr_announcements
  add column if not exists scheduled_at timestamptz;

alter table public.hr_announcements
  add constraint hr_announcements_status_check
  check (status in ('draft', 'scheduled', 'sent'));
