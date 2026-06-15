-- Leave blacklist: flag ex-employees HR must not re-approve / re-register

alter table public.hr_employees
  add column if not exists leave_blacklisted boolean not null default false,
  add column if not exists leave_blacklist_reason text,
  add column if not exists leave_blacklisted_at timestamptz;

alter table public.hr_compliance_notes
  drop constraint if exists hr_compliance_notes_category_check;

alter table public.hr_compliance_notes
  add constraint hr_compliance_notes_category_check
  check (category in ('probation', 'visa', 'work_permit', 'contract', 'blacklist'));
