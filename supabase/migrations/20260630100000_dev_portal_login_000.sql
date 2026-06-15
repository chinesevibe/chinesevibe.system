-- Dev portal login: employee_code 000 @ Head Office (branch code 000)

update public.hr_employees e
set
  role = 'dev',
  status = 'active',
  department = 'IT',
  position = coalesce(nullif(trim(e.position), ''), 'Developers'),
  name = coalesce(nullif(trim(e.name), ''), 'Dev Portal'),
  branch_id = b.id,
  line_user_id = coalesce(e.line_user_id, 'portal_dev_000'),
  updated_at = now()
from public.hr_branches b
where b.code = '000'
  and lower(trim(e.employee_code)) = '000';

insert into public.hr_employees (
  name,
  employee_code,
  branch_id,
  department,
  position,
  role,
  status,
  line_user_id
)
select
  'Dev Portal',
  '000',
  b.id,
  'IT',
  'Developers',
  'dev',
  'active',
  'portal_dev_000'
from public.hr_branches b
where b.code = '000'
  and not exists (
    select 1
    from public.hr_employees e
    where lower(trim(e.employee_code)) = '000'
  );
