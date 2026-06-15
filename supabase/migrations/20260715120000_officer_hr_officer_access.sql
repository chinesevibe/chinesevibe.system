-- Officer department + HR Officer position: grant HR admin RLS + role hr

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
        or (
          trim(e.department) = 'Officer'
          and trim(e.position) = 'HR Officer'
        )
      )
  )
$$;

-- Align existing Head Office HR Officer staff to role hr
update public.hr_employees e
set role = 'hr', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and trim(e.department) = 'Officer'
  and trim(e.position) = 'HR Officer'
  and e.role = 'employee';
