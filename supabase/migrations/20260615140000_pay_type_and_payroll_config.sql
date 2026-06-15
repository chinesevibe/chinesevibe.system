-- pay_type on employees + hr_payroll_config key/value for Odoo sync settings

alter table public.hr_employees
  add column if not exists pay_type text not null default 'hourly'
    check (pay_type in ('monthly', 'hourly'));

-- backfill: Head Office branch code '000' → monthly
update public.hr_employees e
set pay_type = 'monthly'
from public.hr_branches b
where e.branch_id = b.id and b.code = '000';

create table if not exists public.hr_payroll_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.hr_payroll_config enable row level security;

create or replace function hr_payroll_config_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_payroll_config_updated_at on public.hr_payroll_config;
create trigger hr_payroll_config_updated_at
  before update on public.hr_payroll_config
  for each row execute function hr_payroll_config_set_updated_at();

drop policy if exists hr_payroll_config_select on public.hr_payroll_config;
drop policy if exists hr_payroll_config_upsert on public.hr_payroll_config;

create policy hr_payroll_config_select on public.hr_payroll_config
  for select using (hr_is_hr_admin());

create policy hr_payroll_config_upsert on public.hr_payroll_config
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

insert into public.hr_payroll_config (key, value) values
  ('monthly_std_hours', '176'),
  ('ot_multiplier', '1.5'),
  ('sso_cap', '750'),
  ('sso_rate', '0.05'),
  ('work_entry_regular', 'WORK100'),
  ('work_entry_ot', 'OT'),
  ('work_entry_sick', 'LEAVE110'),
  ('work_entry_annual', 'LEAVE120'),
  ('odoo_monthly_struct_name', 'Monthly Salary - Thailand'),
  ('odoo_hourly_struct_name', 'Hourly Wage - Thailand')
on conflict (key) do nothing;
