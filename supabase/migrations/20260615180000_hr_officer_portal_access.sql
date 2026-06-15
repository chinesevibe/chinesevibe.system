-- HR Officer department: admin portal data access (employees, leaves, OT queues)
-- App-layer approvals remain role = 'hr' only.

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
        e.role in ('hr', 'admin', 'dev')
        or trim(e.department) = 'HR Officer'
      )
  )
$$;
