alter table public.hr_employees
add column if not exists housing_allowance numeric(12,2);
