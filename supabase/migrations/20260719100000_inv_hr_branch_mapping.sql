-- T133: Link inventory branches to HR org branches (optional)

alter table public.inv_branches
  add column if not exists hr_branch_id uuid references public.hr_branches (id) on delete set null;

create unique index if not exists inv_branches_hr_branch_id_unique
  on public.inv_branches (hr_branch_id)
  where hr_branch_id is not null;

create index if not exists inv_branches_hr_branch_id_idx
  on public.inv_branches (hr_branch_id);
