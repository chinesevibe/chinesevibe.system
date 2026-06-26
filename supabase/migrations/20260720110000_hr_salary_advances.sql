-- F4: Salary advance table
-- Tracks cash advances to employees that are deducted from a future payroll period

create table if not exists public.hr_salary_advances (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.hr_employees (id) on delete cascade,
  amount        numeric(12, 2) not null check (amount > 0),
  advance_date  date not null,
  deduct_period text not null,           -- 'YYYY-MM' of the payroll run that deducts this
  note          text,
  status        text not null default 'pending'
                  check (status in ('pending', 'deducted', 'cancelled')),
  created_by    text,                    -- employee_id of HR who recorded the advance
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists hr_salary_advances_employee_idx
  on public.hr_salary_advances (employee_id);

create index if not exists hr_salary_advances_period_status_idx
  on public.hr_salary_advances (deduct_period, status);

-- RLS
alter table public.hr_salary_advances enable row level security;

drop policy if exists hr_salary_advances_hr_all on public.hr_salary_advances;
create policy hr_salary_advances_hr_all
  on public.hr_salary_advances
  for all
  using (
    exists (
      select 1 from public.hr_employees e
      where e.id::text = auth.uid()::text
        and e.role in ('hr', 'dev')
    )
  );
