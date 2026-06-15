create table if not exists public.hr_leave_policy_defaults (
  leave_type text primary key
    check (leave_type in ('sick', 'personal', 'annual', 'other')),
  annual_days numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists hr_leave_policy_defaults_set_updated_at
  on public.hr_leave_policy_defaults;

create trigger hr_leave_policy_defaults_set_updated_at
  before update on public.hr_leave_policy_defaults
  for each row execute function public.hr_set_updated_at();

alter table public.hr_leave_policy_defaults enable row level security;

drop policy if exists "leave_policy_defaults select hr only"
  on public.hr_leave_policy_defaults;
create policy "leave_policy_defaults select hr only"
  on public.hr_leave_policy_defaults
  for select to authenticated
  using (public.hr_is_hr_admin());

drop policy if exists "leave_policy_defaults insert hr only"
  on public.hr_leave_policy_defaults;
create policy "leave_policy_defaults insert hr only"
  on public.hr_leave_policy_defaults
  for insert to authenticated
  with check (public.hr_is_hr_admin());

drop policy if exists "leave_policy_defaults update hr only"
  on public.hr_leave_policy_defaults;
create policy "leave_policy_defaults update hr only"
  on public.hr_leave_policy_defaults
  for update to authenticated
  using (public.hr_is_hr_admin())
  with check (public.hr_is_hr_admin());

drop policy if exists "leave_policy_defaults delete hr only"
  on public.hr_leave_policy_defaults;
create policy "leave_policy_defaults delete hr only"
  on public.hr_leave_policy_defaults
  for delete to authenticated
  using (public.hr_is_hr_admin());

insert into public.hr_leave_policy_defaults (leave_type, annual_days)
values
  ('sick', 0),
  ('personal', 0),
  ('annual', 0),
  ('other', 0)
on conflict (leave_type) do nothing;
