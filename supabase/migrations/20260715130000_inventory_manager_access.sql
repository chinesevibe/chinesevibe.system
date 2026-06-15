-- Inventory department + Inventory Manager position: inventory portal access

insert into public.hr_positions (name, department_id, branch_id)
select 'Inventory Manager', d.id, d.branch_id
from public.hr_departments d
join public.hr_branches b on b.id = d.branch_id
where b.code = '000'
  and d.name = 'Inventory'
  and not exists (
    select 1
    from public.hr_positions p
    where p.department_id = d.id
      and p.name = 'Inventory Manager'
  );

-- Align Inventory Manager staff to employee role (inventory portal mode)
update public.hr_employees e
set role = 'employee', updated_at = now()
from public.hr_branches b
where e.branch_id = b.id
  and b.code = '000'
  and trim(e.department) = 'Inventory'
  and trim(e.position) = 'Inventory Manager'
  and e.role in ('employee', 'admin');
