-- HR-assigned employee code (e.g. EMP-001), optional but unique when set

alter table public.hr_employees
  add column if not exists employee_code text;

create unique index if not exists hr_employees_employee_code_unique
  on public.hr_employees (lower(trim(employee_code)))
  where employee_code is not null and trim(employee_code) <> '';
