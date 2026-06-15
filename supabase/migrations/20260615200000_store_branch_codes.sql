-- Renumber store branches: Bang Na 001, Huai Khwang 002, Thonglor 003
-- Head Office stays 000. Order avoids unique(code) conflicts.

update public.hr_branches
set code = '001', updated_at = now()
where name = 'Bang Na' and code = '002';

update public.hr_branches
set code = '002', updated_at = now()
where name = 'Huai Khwang' and code = '003';

update public.hr_branches
set code = '003', updated_at = now()
where name = 'Thonglor' and code = '004';
