-- Align Head Office employee roles with department recommendations (upgrade employee only)

update public.hr_employees e
set role = 'dev', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and e.department = 'IT'
  and e.role = 'employee';

update public.hr_employees e
set role = 'hr', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and e.department = 'HR Officer'
  and e.role = 'employee';

update public.hr_employees e
set role = 'admin', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and e.department = 'Management'
  and e.role = 'employee';

update public.hr_employees e
set role = 'admin', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and e.department in ('Admin', 'Accounting', 'Inventory')
  and e.role = 'employee';
