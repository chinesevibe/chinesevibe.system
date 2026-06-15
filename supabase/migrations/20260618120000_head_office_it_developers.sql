-- Rename default branch → Head Office (code 000), seed IT department + Developers position

update public.hr_branches
set name = 'Head Office',
    code = '000',
    updated_at = now()
where code = 'MAIN'
   or name in ('สาขาหลัก', 'Main');

insert into public.hr_departments (name, branch_id)
select 'IT', b.id
from public.hr_branches b
where b.code = '000'
  and not exists (
    select 1
    from public.hr_departments d
    where d.branch_id = b.id
      and d.name = 'IT'
  );

create table if not exists public.hr_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid references public.hr_departments (id) on delete cascade,
  branch_id uuid references public.hr_branches (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists hr_positions_department_name_uidx
  on public.hr_positions (department_id, name)
  where department_id is not null;

create index if not exists hr_positions_branch_id_idx on public.hr_positions (branch_id);

alter table public.hr_positions enable row level security;

drop policy if exists hr_positions_select on public.hr_positions;
create policy hr_positions_select on public.hr_positions
  for select using (
    hr_is_hr_admin()
    or hr_employee_id() is not null
    or hr_is_branch_manager()
  );

drop policy if exists hr_positions_insert on public.hr_positions;
create policy hr_positions_insert on public.hr_positions
  for insert with check (hr_is_hr_admin());

drop policy if exists hr_positions_update on public.hr_positions;
create policy hr_positions_update on public.hr_positions
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_positions_delete on public.hr_positions;
create policy hr_positions_delete on public.hr_positions
  for delete using (hr_is_hr_admin());

insert into public.hr_positions (name, department_id, branch_id)
select 'Developers', d.id, d.branch_id
from public.hr_departments d
join public.hr_branches b on b.id = d.branch_id
where b.code = '000'
  and d.name = 'IT'
  and not exists (
    select 1
    from public.hr_positions p
    where p.department_id = d.id
      and p.name = 'Developers'
  );
