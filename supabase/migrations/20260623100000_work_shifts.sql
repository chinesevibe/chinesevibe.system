-- Work shifts: master schedules + employee assignment (Phase 1 schema)

create table if not exists public.hr_work_shifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_hour smallint not null check (start_hour between 0 and 23),
  start_minute smallint not null default 0 check (start_minute between 0 and 59),
  end_hour smallint not null check (end_hour between 0 and 23),
  end_minute smallint not null default 0 check (end_minute between 0 and 59),
  crosses_midnight boolean not null default false,
  grace_minutes smallint not null default 10 check (grace_minutes between 0 and 120),
  standard_hours numeric(4, 2) not null check (standard_hours > 0 and standard_hours <= 24),
  check_in_early_minutes smallint not null default 60 check (check_in_early_minutes between 0 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hr_work_shifts_set_updated_at
  before update on public.hr_work_shifts
  for each row execute function public.hr_set_updated_at();

alter table public.hr_employees
  add column if not exists work_shift_id uuid references public.hr_work_shifts (id) on delete set null;

create index if not exists hr_employees_work_shift_id_idx
  on public.hr_employees (work_shift_id);

alter table public.hr_attendance
  add column if not exists work_shift_id uuid references public.hr_work_shifts (id) on delete set null,
  add column if not exists shift_date date;

create index if not exists hr_attendance_work_shift_id_idx
  on public.hr_attendance (work_shift_id);

create index if not exists hr_attendance_shift_date_idx
  on public.hr_attendance (shift_date);

-- Seed company shift templates
insert into public.hr_work_shifts (
  code,
  name,
  start_hour,
  start_minute,
  end_hour,
  end_minute,
  crosses_midnight,
  grace_minutes,
  standard_hours,
  check_in_early_minutes
)
values
  (
    'OFFICE',
    'Office 11:00–20:00',
    11,
    0,
    20,
    0,
    false,
    10,
    9.00,
    60
  ),
  (
    'BRANCH_MGR',
    'Branch Manager 10:00–22:00',
    10,
    0,
    22,
    0,
    false,
    10,
    10.00,
    60
  ),
  (
    'BRANCH_DAY',
    'Branch Day 10:00–22:00',
    10,
    0,
    22,
    0,
    false,
    10,
    10.00,
    60
  ),
  (
    'BRANCH_NIGHT',
    'Branch Night 14:00–02:00',
    14,
    0,
    2,
    0,
    true,
    10,
    10.00,
    60
  )
on conflict (code) do nothing;

alter table public.hr_work_shifts enable row level security;

create policy hr_work_shifts_select on public.hr_work_shifts
  for select using (
    hr_is_hr_admin()
    or hr_is_ceo()
    or hr_employee_id() is not null
  );

create policy hr_work_shifts_write on public.hr_work_shifts
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

comment on table public.hr_work_shifts is 'Master work shift templates for attendance late/OT rules';
comment on column public.hr_employees.work_shift_id is 'HR-assigned shift; used by check-in/out (Phase 3)';
comment on column public.hr_attendance.work_shift_id is 'Shift snapshot at check-in';
comment on column public.hr_attendance.shift_date is 'Logical shift day (important for overnight shifts)';
