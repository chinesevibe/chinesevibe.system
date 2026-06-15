-- Track whether locale was chosen in Portal (manual) or synced from LINE app.
alter table public.hr_employees
  add column if not exists locale_source text not null default 'line'
  check (locale_source in ('line', 'manual'));

comment on column public.hr_employees.locale_source is
  'line = follow LINE app language (LIFF sync); manual = user picked in Portal';
