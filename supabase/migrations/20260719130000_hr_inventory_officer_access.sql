-- HR inventory ops: align with hr_is_hr_admin (role hr/dev + HR Officer staff)

create or replace function public.inv_can_manage_requisitions()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.hr_is_hr_admin()
    or exists (
      select 1
      from public.hr_employees e
      where e.id = public.hr_employee_id()
        and e.status = 'active'
        and e.role = 'inventory'
    )
$$;

revoke execute on function public.inv_can_manage_requisitions() from public, anon;
grant execute on function public.inv_can_manage_requisitions() to authenticated, service_role;
