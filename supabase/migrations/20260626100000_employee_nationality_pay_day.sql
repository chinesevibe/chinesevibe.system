-- Employee nationality + payroll pay day (4 = Thai/Myanmar, 5 = Chinese)

alter table public.hr_employees
  add column if not exists nationality text
    check (nationality is null or nationality in ('thai', 'myanmar', 'chinese')),
  add column if not exists pay_day smallint
    check (pay_day is null or pay_day in (4, 5));

comment on column public.hr_employees.nationality is 'thai | myanmar | chinese — drives default pay_day';
comment on column public.hr_employees.pay_day is 'Payroll transfer day of month (4 or 5). Overrides nationality default when set.';

-- Default existing employees to Thai pay schedule (day 4)
update public.hr_employees
set pay_day = 4
where pay_day is null;
