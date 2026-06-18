-- Per-employee weekly off days (ISO weekday 1=Mon .. 7=Sun).
alter table public.hr_employees
  add column if not exists off_days integer[] not null default '{}';

comment on column public.hr_employees.off_days is
  'Regular weekly off days (1=Mon .. 7=Sun). Empty = no fixed weekly off.';

alter table public.hr_employees
  drop constraint if exists hr_employees_off_days_check;

alter table public.hr_employees
  add constraint hr_employees_off_days_check
  check (off_days <@ array[1, 2, 3, 4, 5, 6, 7]::integer[]);
