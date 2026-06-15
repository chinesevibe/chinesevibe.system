alter table public.hr_branches
  add column if not exists address text;

comment on column public.hr_branches.address is 'ที่อยู่สาขา — แสดงใน Branch detail';
