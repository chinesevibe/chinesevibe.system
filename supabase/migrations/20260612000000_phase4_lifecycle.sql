-- Phase 4: employee lifecycle (probation outcome, contract end, compliance notes)

alter table public.hr_employees
  add column if not exists contract_end date,
  add column if not exists probation_outcome text
    check (probation_outcome is null or probation_outcome in ('passed', 'failed', 'extended')),
  add column if not exists probation_outcome_note text,
  add column if not exists probation_extended_until date;

create table if not exists public.hr_compliance_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  category text not null check (category in ('probation', 'visa', 'work_permit', 'contract')),
  note text not null,
  created_by uuid references public.hr_employees (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hr_compliance_notes_employee_id_idx
  on public.hr_compliance_notes (employee_id);

alter table public.hr_compliance_notes enable row level security;

create policy hr_compliance_notes_select on public.hr_compliance_notes
  for select using (hr_is_hr_admin());

create policy hr_compliance_notes_insert on public.hr_compliance_notes
  for insert with check (hr_is_hr_admin());

-- hr_runtime_config: HR read/write via session API
drop policy if exists hr_runtime_config_select on public.hr_runtime_config;
drop policy if exists hr_runtime_config_upsert on public.hr_runtime_config;

create policy hr_runtime_config_select on public.hr_runtime_config
  for select using (hr_is_hr_admin());

create policy hr_runtime_config_upsert on public.hr_runtime_config
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());
