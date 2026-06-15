-- Dev role: full admin access for development / maintenance

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager', 'ceo', 'dev'));

create or replace function public.hr_is_dev()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'dev'
  )
$$;

create or replace function public.hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role in ('hr', 'admin', 'dev')
  )
$$;

create or replace function public.hr_can_read_company()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin() or hr_is_ceo()
$$;

grant execute on function public.hr_is_dev() to authenticated, service_role;
