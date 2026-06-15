-- Native payroll engine: runs, payslips, lines + storage bucket

-- ============================================================
-- hr_payroll_runs
-- ============================================================
create table if not exists public.hr_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  period_start date not null,
  period_end date not null,
  cutoff_day int check (cutoff_day between 1 and 31),
  status text not null default 'draft' check (status in ('draft', 'locked', 'paid')),
  locked_at timestamptz,
  locked_by uuid references public.hr_employees (id) on delete set null,
  employee_count int not null default 0,
  total_gross numeric(12, 2) not null default 0,
  total_net numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period)
);

create index if not exists hr_payroll_runs_period_idx on public.hr_payroll_runs (period);
create index if not exists hr_payroll_runs_status_idx on public.hr_payroll_runs (status);

-- ============================================================
-- hr_payslips
-- ============================================================
create table if not exists public.hr_payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  pay_type text not null check (pay_type in ('monthly', 'hourly')),
  pay_day int not null check (pay_day in (4, 5)),
  payment_date date not null,
  gross_amount numeric(12, 2) not null default 0,
  sso_deduction numeric(12, 2) not null default 0,
  other_deductions numeric(12, 2) not null default 0,
  tax_deduction numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'final')),
  pdf_path text,
  regular_hours numeric(8, 2) not null default 0,
  ot_hours numeric(8, 2) not null default 0,
  sick_hours numeric(8, 2) not null default 0,
  annual_hours numeric(8, 2) not null default 0,
  base_rate numeric(12, 2),
  monthly_salary numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create index if not exists hr_payslips_run_idx on public.hr_payslips (run_id);
create index if not exists hr_payslips_employee_idx on public.hr_payslips (employee_id);

-- ============================================================
-- hr_payslip_lines
-- ============================================================
create table if not exists public.hr_payslip_lines (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references public.hr_payslips (id) on delete cascade,
  code text not null,
  label text not null,
  amount numeric(12, 2) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hr_payslip_lines_payslip_idx on public.hr_payslip_lines (payslip_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.hr_payroll_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_payroll_runs_updated_at on public.hr_payroll_runs;
create trigger hr_payroll_runs_updated_at
  before update on public.hr_payroll_runs
  for each row execute function public.hr_payroll_set_updated_at();

drop trigger if exists hr_payslips_updated_at on public.hr_payslips;
create trigger hr_payslips_updated_at
  before update on public.hr_payslips
  for each row execute function public.hr_payroll_set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.hr_payroll_runs enable row level security;
alter table public.hr_payslips enable row level security;
alter table public.hr_payslip_lines enable row level security;

drop policy if exists hr_payroll_runs_hr on public.hr_payroll_runs;
create policy hr_payroll_runs_hr on public.hr_payroll_runs
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_payslips_select on public.hr_payslips;
create policy hr_payslips_select on public.hr_payslips
  for select using (employee_id = hr_employee_id() or hr_is_hr_admin());

drop policy if exists hr_payslips_write on public.hr_payslips;
create policy hr_payslips_write on public.hr_payslips
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_payslip_lines_select on public.hr_payslip_lines;
create policy hr_payslip_lines_select on public.hr_payslip_lines
  for select using (
    hr_is_hr_admin()
    or exists (
      select 1 from public.hr_payslips p
      where p.id = payslip_id and p.employee_id = hr_employee_id()
    )
  );

drop policy if exists hr_payslip_lines_write on public.hr_payslip_lines;
create policy hr_payslip_lines_write on public.hr_payslip_lines
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- ============================================================
-- Config keys
-- ============================================================
insert into public.hr_payroll_config (key, value) values
  ('payroll_cutoff_day', '31'),
  ('tax_enabled', 'false'),
  ('tax_rate', '0'),
  ('leave_sick_deduct_enabled', 'false')
on conflict (key) do nothing;

-- ============================================================
-- Storage bucket: payroll-payslips (private)
-- Path: {employee_id}/{run_id}.pdf
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payroll-payslips',
  'payroll-payslips',
  false,
  5242880,
  array['application/pdf']::text[]
)
on conflict (id) do nothing;

drop policy if exists payroll_payslips_select on storage.objects;
create policy payroll_payslips_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payroll-payslips'
    and (
      hr_is_hr_admin()
      or (storage.foldername(name))[1] = hr_employee_id()::text
    )
  );
