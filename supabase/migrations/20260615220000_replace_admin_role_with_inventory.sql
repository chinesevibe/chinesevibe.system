-- Replace employee role admin → inventory

update public.hr_employees
set role = 'inventory', updated_at = now()
where role = 'admin';

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees
  add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'inventory', 'branch_manager', 'ceo', 'dev'));

do $$
begin
  if to_regclass('public.inv_damage_reports') is not null then
    update public.inv_damage_reports
    set approval_required_role = 'inventory'
    where approval_required_role = 'admin';

    alter table public.inv_damage_reports
      drop constraint if exists inv_damage_reports_approval_required_role_check;

    alter table public.inv_damage_reports
      add constraint inv_damage_reports_approval_required_role_check
      check (approval_required_role in ('auto', 'hr', 'inventory'));
  end if;
end $$;

create or replace function public.hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.line_user_id = hr_line_user_id()
      and e.status = 'active'
      and (
        e.role in ('hr', 'dev')
        or trim(e.department) = 'HR Officer'
        or (
          trim(e.department) = 'Officer'
          and trim(e.position) = 'HR Officer'
        )
      )
  )
$$;

do $$
begin
  if to_regprocedure('public.inv_can_manage_damage()') is not null then
    execute $fn$
      create or replace function public.inv_can_manage_damage()
      returns boolean
      language sql stable security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('hr', 'inventory', 'dev', 'ceo')
        )
      $body$
    $fn$;
  end if;

  if to_regprocedure('public.inv_can_admin_damage()') is not null then
    execute $fn$
      create or replace function public.inv_can_admin_damage()
      returns boolean
      language sql stable security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('inventory', 'dev')
        )
      $body$
    $fn$;
  end if;

  if to_regprocedure('public.inv_can_approve_damage()') is not null then
    execute $fn$
      create or replace function public.inv_can_approve_damage()
      returns boolean
      language sql stable security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('hr', 'inventory', 'dev')
        )
      $body$
    $fn$;
  end if;
end $$;
