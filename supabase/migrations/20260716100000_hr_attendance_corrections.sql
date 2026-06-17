-- Employee self-service attendance corrections audit log (retro check-in/out limits)

create table if not exists public.hr_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  work_date date not null,
  correction_type text not null check (correction_type in ('checkin', 'checkout')),
  source text not null default 'employee' check (source in ('employee', 'hr')),
  attendance_id uuid references public.hr_attendance (id) on delete set null,
  created_by uuid references public.hr_employees (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hr_attendance_corrections_employee_created_idx
  on public.hr_attendance_corrections (employee_id, created_at desc);

create index if not exists hr_attendance_corrections_work_date_idx
  on public.hr_attendance_corrections (employee_id, work_date);

alter table public.hr_attendance_corrections enable row level security;

create policy hr_attendance_corrections_self_select
  on public.hr_attendance_corrections
  for select
  to authenticated
  using (
    employee_id in (
      select id from public.hr_employees
      where line_user_id = (auth.jwt() ->> 'line_user_id')
    )
  );

create policy hr_attendance_corrections_hr_all
  on public.hr_attendance_corrections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.hr_employees e
      where e.line_user_id = (auth.jwt() ->> 'line_user_id')
        and e.role in ('hr', 'ceo', 'dev', 'inventory')
    )
  )
  with check (
    exists (
      select 1 from public.hr_employees e
      where e.line_user_id = (auth.jwt() ->> 'line_user_id')
        and e.role in ('hr', 'ceo', 'dev', 'inventory')
    )
  );
