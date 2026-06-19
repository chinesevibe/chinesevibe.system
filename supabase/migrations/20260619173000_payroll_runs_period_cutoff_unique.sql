alter table public.hr_payroll_runs
  drop constraint if exists hr_payroll_runs_period_key;

create unique index if not exists hr_payroll_runs_period_cutoff_uidx
  on public.hr_payroll_runs (period, cutoff_day);
