-- Expand leave types: maternity, unpaid, emergency (keep other for legacy rows)

alter table public.hr_leave_policy_defaults
  drop constraint if exists hr_leave_policy_defaults_leave_type_check;

alter table public.hr_leave_policy_defaults
  add constraint hr_leave_policy_defaults_leave_type_check
  check (
    leave_type in (
      'sick',
      'personal',
      'annual',
      'maternity',
      'unpaid',
      'emergency',
      'other'
    )
  );

insert into public.hr_leave_policy_defaults (leave_type, annual_days)
values
  ('maternity', 0),
  ('unpaid', 0),
  ('emergency', 0)
on conflict (leave_type) do nothing;
