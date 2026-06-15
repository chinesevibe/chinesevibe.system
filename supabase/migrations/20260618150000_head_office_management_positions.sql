-- Head Office (000): flat department structure + default positions
-- Departments: Management, HR Officer, Inventory, Accounting, Admin
-- (IT + Developers seeded in 20260618120000_head_office_it_developers.sql)

insert into public.hr_departments (name, branch_id)
select dept.name, b.id
from public.hr_branches b
cross join (
  values
    ('Management'),
    ('HR Officer'),
    ('Inventory'),
    ('Accounting'),
    ('Admin')
) as dept(name)
where b.code = '000'
  and not exists (
    select 1
    from public.hr_departments d
    where d.branch_id = b.id
      and d.name = dept.name
  );

insert into public.hr_positions (name, department_id, branch_id)
select pos.position_name, d.id, d.branch_id
from public.hr_departments d
join public.hr_branches b on b.id = d.branch_id
join (
  values
    ('Management', 'Manager'),
    ('HR Officer', 'HR Officer'),
    ('Inventory', 'Inventory'),
    ('Accounting', 'Accounting'),
    ('Admin', 'Admin')
) as pos(dept_name, position_name) on pos.dept_name = d.name
where b.code = '000'
  and not exists (
    select 1
    from public.hr_positions p
    where p.department_id = d.id
      and p.name = pos.position_name
  );

-- Remove legacy positions incorrectly nested under Management (sub-unit seed)
delete from public.hr_positions p
using public.hr_departments d
join public.hr_branches b on b.id = d.branch_id
where p.department_id = d.id
  and b.code = '000'
  and d.name = 'Management'
  and p.name in ('HR Officer', 'Inventory', 'Accounting', 'Admin');
