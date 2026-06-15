-- Employee UI language preference (Portal + LINE OA messages)
alter table public.hr_employees
  add column if not exists preferred_locale text not null default 'th'
  check (preferred_locale in ('th', 'en', 'zh', 'my'));

comment on column public.hr_employees.preferred_locale is
  'UI language: th=Thai, en=English, zh=Chinese, my=Myanmar (Burmese)';
