-- Officer department: portal login password (first login sets password)

alter table public.hr_employees
  add column if not exists portal_password_hash text;

comment on column public.hr_employees.portal_password_hash is
  'Scrypt hash for employee-code portal login; required for Officer department staff.';
