-- HR + Inventory Full Migration (v3.1 - HEAD OFFICE BRANCH FIXED)
-- Data: Added missing Head Office branch


-- Migration: 20260610042343_init_hr_schema.sql

-- T02: HR Payroll Phase 1 schema
-- 5 tables (hr_ prefix) + indexes + updated_at triggers + RLS policies.
-- Auth bridge for T04 (LINE Login): policies reference SECURITY DEFINER helpers only;
-- the JWT must carry a `line_user_id` claim — change hr_line_user_id() if T04 picks
-- a different mapping. Server-side cron/webhook uses service_role and bypasses RLS.

-- ============================================================
-- Shared trigger function
-- ============================================================

create or replace function hr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tables
-- ============================================================

create table hr_employees (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  name text not null,
  position text,
  department text,
  salary numeric(12,2),
  contract_start date,
  probation_end date,
  visa_expiry date,
  work_permit_expiry date,
  role text not null default 'employee' check (role in ('employee', 'hr', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  check_in_location jsonb,
  is_late boolean not null default false,
  work_hours numeric(5,2),
  created_at timestamptz not null default now()
);

create table hr_leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references hr_employees(id),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table hr_leave_balances (
  employee_id uuid not null references hr_employees(id),
  leave_type text not null,
  total_days numeric(5,2) not null default 0,
  used_days numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (employee_id, leave_type)
);

create table hr_alerts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references hr_employees(id),
  alert_type text not null,
  trigger_date date not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index hr_employees_status_idx on hr_employees (status);
create index hr_attendance_employee_id_check_in_at_idx on hr_attendance (employee_id, check_in_at);
create index hr_leaves_employee_id_idx on hr_leaves (employee_id);
create index hr_leaves_status_idx on hr_leaves (status);
create index hr_alerts_employee_id_idx on hr_alerts (employee_id);
create index hr_alerts_status_idx on hr_alerts (status);
create index hr_alerts_trigger_date_idx on hr_alerts (trigger_date);

-- ============================================================
-- updated_at triggers
-- ============================================================

create trigger hr_employees_set_updated_at
  before update on hr_employees
  for each row execute function hr_set_updated_at();

create trigger hr_leaves_set_updated_at
  before update on hr_leaves
  for each row execute function hr_set_updated_at();

create trigger hr_leave_balances_set_updated_at
  before update on hr_leave_balances
  for each row execute function hr_set_updated_at();

-- ============================================================
-- Auth helper functions (T04 wiring point)
-- ============================================================

create or replace function hr_line_user_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'line_user_id', '')
$$;

-- SECURITY DEFINER: avoids RLS recursion when hr_employees policies look up the caller.
create or replace function hr_employee_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from hr_employees where line_user_id = hr_line_user_id()
$$;

-- Role comes from hr_employees (single source of truth), not a JWT claim.
create or replace function hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from hr_employees
    where line_user_id = hr_line_user_id() and role in ('hr', 'admin')
  )
$$;

revoke execute on function hr_line_user_id() from public, anon;
revoke execute on function hr_employee_id() from public, anon;
revoke execute on function hr_is_hr_admin() from public, anon;
grant execute on function hr_line_user_id() to authenticated, service_role;
grant execute on function hr_employee_id() to authenticated, service_role;
grant execute on function hr_is_hr_admin() to authenticated, service_role;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table hr_employees enable row level security;
alter table hr_attendance enable row level security;
alter table hr_leaves enable row level security;
alter table hr_leave_balances enable row level security;
alter table hr_alerts enable row level security;

-- hr_employees: employee reads own row; hr/admin full access
create policy "employees select self or hr" on hr_employees
  for select to authenticated
  using (id = hr_employee_id() or hr_is_hr_admin());

create policy "employees insert hr only" on hr_employees
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "employees update hr only" on hr_employees
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "employees delete hr only" on hr_employees
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_attendance: employee reads/writes own rows (check-in/check-out); hr/admin full access
create policy "attendance select self or hr" on hr_attendance
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance insert self or hr" on hr_attendance
  for insert to authenticated
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance update self or hr" on hr_attendance
  for update to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin())
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "attendance delete hr only" on hr_attendance
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_leaves: employee reads own + submits own; only hr/admin update (approve/reject) or delete
create policy "leaves select self or hr" on hr_leaves
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leaves insert self or hr" on hr_leaves
  for insert to authenticated
  with check (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leaves update hr only" on hr_leaves
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "leaves delete hr only" on hr_leaves
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_leave_balances: employee reads own balance; hr/admin manage
create policy "leave_balances select self or hr" on hr_leave_balances
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy "leave_balances insert hr only" on hr_leave_balances
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "leave_balances update hr only" on hr_leave_balances
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "leave_balances delete hr only" on hr_leave_balances
  for delete to authenticated
  using (hr_is_hr_admin());

-- hr_alerts: cron (service_role, bypasses RLS) writes; hr/admin manage; employees no access
create policy "alerts select hr only" on hr_alerts
  for select to authenticated
  using (hr_is_hr_admin());

create policy "alerts insert hr only" on hr_alerts
  for insert to authenticated
  with check (hr_is_hr_admin());

create policy "alerts update hr only" on hr_alerts
  for update to authenticated
  using (hr_is_hr_admin())
  with check (hr_is_hr_admin());

create policy "alerts delete hr only" on hr_alerts
  for delete to authenticated
  using (hr_is_hr_admin());


-- Migration: 20260610072959_auth_line_claim.sql

-- T04: read line_user_id from app_metadata claim (set server-side at login).
-- Top-level claim kept first for forward-compat with a future access token hook.
-- Rollback: restore the T02 body (top-level claim only).

create or replace function hr_line_user_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'line_user_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'line_user_id', '')
  )
$$;


-- Migration: 20260610111320_morning_push_cron.sql

-- T10: schedule morning-push edge function at 09:00 ICT Mon-Fri (02:00 UTC).
-- Secrets come from Vault (names: project_url, secret_key) — never hardcoded.
-- On environments without those vault entries (e.g. fresh local) the schedule
-- step is skipped with a NOTICE; re-run the DO block after adding them.
-- Rollback: select cron.unschedule('morning-push');

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'morning-push cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('morning-push')
    where exists (select 1 from cron.job where jobname = 'morning-push');

  perform cron.schedule(
    'morning-push',
    '0 2 * * 1-5',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/morning-push',
      v_key
    )
  );
end $$;


-- Migration: 20260610123140_leave_attachments_bucket.sql

-- T16: private Storage bucket for leave attachments (medical certificates).
-- Files are uploaded by T17 under the path <auth.uid()>/<filename>; T16 only
-- prepares the bucket + policies so the flow is ready (no uploads yet).
-- Rollback:
--   drop policy "leave attachments insert own folder" on storage.objects;
--   drop policy "leave attachments select own or hr" on storage.objects;
--   delete from storage.buckets where id = 'leave-attachments';

insert into storage.buckets (id, name, public)
values ('leave-attachments', 'leave-attachments', false)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; policies only.
-- Owner = first path segment must be the caller's auth.uid().
create policy "leave attachments insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'leave-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: owner of the folder, or HR/admin (role from hr_employees via
-- security-definer hr_is_hr_admin(), same as the hr_* table policies).
create policy "leave attachments select own or hr"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'leave-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or hr_is_hr_admin()
    )
  );


-- Migration: 20260610173216_probation_alert_cron.sql

-- T21: schedule probation-alert edge function daily at 09:30 ICT (02:30 UTC).
-- Daily (not Mon-Fri) so milestones that fall on weekends still alert.
-- Secrets come from Vault (names: project_url, secret_key — same entries
-- morning-push uses) — never hardcoded. On environments without those vault
-- entries (e.g. fresh local) the schedule step is skipped with a NOTICE;
-- re-run the DO block after adding them.
-- Rollback: select cron.unschedule('probation-alert');

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'probation-alert cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('probation-alert')
    where exists (select 1 from cron.job where jobname = 'probation-alert');

  perform cron.schedule(
    'probation-alert',
    '30 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/probation-alert',
      v_key
    )
  );
end $$;


-- Migration: 20260610220000_leave_decision_note.sql

-- T18/T19: HR decision note on leave requests (approve comment or reject reason).
alter table hr_leaves add column if not exists decision_note text;


-- Migration: 20260610220100_visa_alert_cron.sql

-- T22: schedule visa-alert edge function daily at 09:35 ICT (02:35 UTC).
-- Rollback: select cron.unschedule('visa-alert');

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'visa-alert cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('visa-alert')
    where exists (select 1 from cron.job where jobname = 'visa-alert');

  perform cron.schedule(
    'visa-alert',
    '35 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/visa-alert',
      v_key
    )
  );
end $$;


-- Migration: 20260610230000_evening_summary_cron.sql

-- T24+T25: schedule evening-summary at 18:00 ICT Mon-Fri (11:00 UTC).
-- Rollback: select cron.unschedule('evening-summary');

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'evening-summary cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('evening-summary')
    where exists (select 1 from cron.job where jobname = 'evening-summary');

  perform cron.schedule(
    'evening-summary',
    '0 11 * * 1-5',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/evening-summary',
      v_key
    )
  );
end $$;


-- Migration: 20260611140000_employee_profile_fields.sql

-- T14: additional employee profile fields

alter table hr_employees
  add column if not exists date_of_birth date,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists contract_type text
    check (contract_type is null or contract_type in ('full_time', 'part_time', 'contract'));


-- Migration: 20260611180000_hr_runtime_config.sql

-- Runtime key/value for ops (e.g. captured LINE group id). Service role only.
create table if not exists public.hr_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.hr_runtime_config enable row level security;

create or replace function hr_runtime_config_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_runtime_config_updated_at on public.hr_runtime_config;
create trigger hr_runtime_config_updated_at
  before update on public.hr_runtime_config
  for each row execute function hr_runtime_config_set_updated_at();


-- Migration: 20260611190000_phase2_support_features.sql

-- Phase 2: F7 Document Request, F8 Complaint, F9 Announcements

-- F7: Document requests
create table if not exists public.hr_document_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  doc_type text not null check (doc_type in ('employment_cert', 'salary_cert', 'tax_cert', 'other')),
  copies smallint not null default 1 check (copies >= 1 and copies <= 10),
  purpose text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'completed')),
  hr_note text,
  result_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_document_requests_employee_id_idx on public.hr_document_requests (employee_id);
create index if not exists hr_document_requests_status_idx on public.hr_document_requests (status);

-- F8: Complaints
create table if not exists public.hr_complaints (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees (id) on delete set null,
  ticket_code text not null unique,
  subject text not null,
  body text not null,
  is_anonymous boolean not null default false,
  status text not null default 'open' check (status in ('open', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_complaints_status_idx on public.hr_complaints (status);
create index if not exists hr_complaints_ticket_code_idx on public.hr_complaints (ticket_code);

create table if not exists public.hr_complaint_replies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.hr_complaints (id) on delete cascade,
  author_employee_id uuid not null references public.hr_employees (id) on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists hr_complaint_replies_complaint_id_idx on public.hr_complaint_replies (complaint_id);

-- F9: Announcements
create table if not exists public.hr_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_type text not null default 'all' check (target_type in ('all', 'department')),
  target_value text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_by uuid references public.hr_employees (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hr_announcements_status_idx on public.hr_announcements (status);

-- updated_at triggers
create or replace function public.hr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_document_requests_updated_at on public.hr_document_requests;
create trigger hr_document_requests_updated_at
  before update on public.hr_document_requests
  for each row execute function public.hr_set_updated_at();

drop trigger if exists hr_complaints_updated_at on public.hr_complaints;
create trigger hr_complaints_updated_at
  before update on public.hr_complaints
  for each row execute function public.hr_set_updated_at();

-- RLS
alter table public.hr_document_requests enable row level security;
alter table public.hr_complaints enable row level security;
alter table public.hr_complaint_replies enable row level security;
alter table public.hr_announcements enable row level security;

-- hr_document_requests
create policy hr_document_requests_select on public.hr_document_requests
  for select using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy hr_document_requests_insert on public.hr_document_requests
  for insert with check (employee_id = hr_employee_id());

create policy hr_document_requests_update on public.hr_document_requests
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_document_requests_delete on public.hr_document_requests
  for delete using (hr_is_hr_admin());

-- hr_complaints: employees see own non-anonymous; HR sees all
create policy hr_complaints_select on public.hr_complaints
  for select using (
    hr_is_hr_admin()
    or (not is_anonymous and employee_id = hr_employee_id())
  );

create policy hr_complaints_insert on public.hr_complaints
  for insert with check (
    hr_employee_id() is not null
    and (
      (not is_anonymous and employee_id = hr_employee_id())
      or (is_anonymous and employee_id is null)
    )
  );

create policy hr_complaints_update on public.hr_complaints
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- hr_complaint_replies
create policy hr_complaint_replies_select on public.hr_complaint_replies
  for select using (
    hr_is_hr_admin()
    or exists (
      select 1 from public.hr_complaints c
      where c.id = complaint_id
        and not c.is_anonymous
        and c.employee_id = hr_employee_id()
    )
  );

create policy hr_complaint_replies_insert on public.hr_complaint_replies
  for insert with check (hr_is_hr_admin() and author_employee_id = hr_employee_id());

-- hr_announcements: HR only
create policy hr_announcements_select on public.hr_announcements
  for select using (hr_is_hr_admin());

create policy hr_announcements_insert on public.hr_announcements
  for insert with check (hr_is_hr_admin());

create policy hr_announcements_update on public.hr_announcements
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_announcements_delete on public.hr_announcements
  for delete using (hr_is_hr_admin());

-- Storage bucket for HR document results
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-documents',
  'hr-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy hr_documents_storage_select on storage.objects
  for select using (
    bucket_id = 'hr-documents'
    and (
      hr_is_hr_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy hr_documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );

create policy hr_documents_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );

create policy hr_documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );


-- Migration: 20260611220000_phase3_operations.sql

-- Phase 3: F10 OT, departments, scheduled announcements

-- F10: Overtime requests
create table if not exists public.hr_overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_overtime_end_after_start check (end_time > start_time)
);

create index if not exists hr_overtime_requests_employee_id_idx on public.hr_overtime_requests (employee_id);
create index if not exists hr_overtime_requests_status_idx on public.hr_overtime_requests (status);

drop trigger if exists hr_overtime_requests_updated_at on public.hr_overtime_requests;
create trigger hr_overtime_requests_updated_at
  before update on public.hr_overtime_requests
  for each row execute function public.hr_set_updated_at();

alter table public.hr_overtime_requests enable row level security;

create policy hr_overtime_select on public.hr_overtime_requests
  for select using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (employee_id = hr_employee_id());

create policy hr_overtime_update on public.hr_overtime_requests
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- Organization: departments master
create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.hr_departments enable row level security;

create policy hr_departments_select on public.hr_departments
  for select using (hr_is_hr_admin() or hr_employee_id() is not null);

create policy hr_departments_insert on public.hr_departments
  for insert with check (hr_is_hr_admin());

create policy hr_departments_update on public.hr_departments
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_departments_delete on public.hr_departments
  for delete using (hr_is_hr_admin());

-- Scheduled announcements
alter table public.hr_announcements
  drop constraint if exists hr_announcements_status_check;

alter table public.hr_announcements
  add column if not exists scheduled_at timestamptz;

alter table public.hr_announcements
  add constraint hr_announcements_status_check
  check (status in ('draft', 'scheduled', 'sent'));


-- Migration: 20260611230000_phase3_cron_schedules.sql

-- Phase 3 cron: weekly-summary, monthly-summary, announcement-scheduler
-- ICT = UTC+7 → 08:00 ICT = 01:00 UTC
-- Rollback:
--   select cron.unschedule('weekly-summary');
--   select cron.unschedule('monthly-summary');
--   select cron.unschedule('announcement-scheduler');

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'phase3 cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  -- weekly-summary: Monday 08:00 ICT (01:00 UTC)
  perform cron.unschedule('weekly-summary')
    where exists (select 1 from cron.job where jobname = 'weekly-summary');
  perform cron.schedule(
    'weekly-summary',
    '0 1 * * 1',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/weekly-summary',
      v_key
    )
  );

  -- monthly-summary: 1st of month 08:00 ICT (01:00 UTC on day 1)
  perform cron.unschedule('monthly-summary')
    where exists (select 1 from cron.job where jobname = 'monthly-summary');
  perform cron.schedule(
    'monthly-summary',
    '0 1 1 * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/monthly-summary',
      v_key
    )
  );

  -- announcement-scheduler: every 10 minutes
  perform cron.unschedule('announcement-scheduler')
    where exists (select 1 from cron.job where jobname = 'announcement-scheduler');
  perform cron.schedule(
    'announcement-scheduler',
    '*/10 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/announcement-scheduler',
      v_key
    )
  );
end $$;


-- Migration: 20260612000000_phase4_lifecycle.sql

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


-- Migration: 20260612010000_contract_alert_cron.sql

-- T72: contract-alert daily 09:00 ICT (02:00 UTC)
do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'contract-alert cron skipped: vault secrets not set';
    return;
  end if;

  perform cron.unschedule('contract-alert')
    where exists (select 1 from cron.job where jobname = 'contract-alert');

  perform cron.schedule(
    'contract-alert',
    '0 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/contract-alert',
      v_key
    )
  );
end $$;


-- Migration: 20260613000000_phase5_branches_approval.sql

-- Phase 5: branches, branch_manager role, two-tier approval, payroll hours ledger

-- ============================================================
-- Branches
-- ============================================================

create table if not exists public.hr_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  manager_employee_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hr_branches_set_updated_at
  before update on public.hr_branches
  for each row execute function public.hr_set_updated_at();

-- Default branch for data migration
insert into public.hr_branches (name, code)
values ('สาขาหลัก', 'MAIN')
on conflict (code) do nothing;

-- ============================================================
-- Departments under branch
-- ============================================================

alter table public.hr_departments
  add column if not exists branch_id uuid references public.hr_branches (id) on delete restrict;

update public.hr_departments d
set branch_id = b.id
from public.hr_branches b
where b.code = 'MAIN' and d.branch_id is null;

alter table public.hr_departments drop constraint if exists hr_departments_name_key;

create unique index if not exists hr_departments_branch_name_uidx
  on public.hr_departments (branch_id, name)
  where branch_id is not null;

-- Seed departments from employee text column
insert into public.hr_departments (name, branch_id)
select distinct e.department, b.id
from public.hr_employees e
cross join public.hr_branches b
where b.code = 'MAIN'
  and e.department is not null
  and trim(e.department) <> ''
  and not exists (
    select 1 from public.hr_departments d
    where d.branch_id = b.id and d.name = e.department
  );

-- ============================================================
-- Employees: branch + department FK, branch_manager role
-- ============================================================

alter table public.hr_employees
  add column if not exists branch_id uuid references public.hr_branches (id) on delete set null,
  add column if not exists department_id uuid references public.hr_departments (id) on delete set null;

update public.hr_employees e
set branch_id = b.id
from public.hr_branches b
where b.code = 'MAIN' and e.branch_id is null;

update public.hr_employees e
set department_id = d.id
from public.hr_departments d
where e.department is not null
  and d.name = e.department
  and d.branch_id = e.branch_id
  and e.department_id is null;

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees
  add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager'));

alter table public.hr_branches
  drop constraint if exists hr_branches_manager_employee_id_fkey;
alter table public.hr_branches
  add constraint hr_branches_manager_employee_id_fkey
  foreign key (manager_employee_id) references public.hr_employees (id) on delete set null;

create index if not exists hr_employees_branch_id_idx on public.hr_employees (branch_id);
create index if not exists hr_departments_branch_id_idx on public.hr_departments (branch_id);

-- ============================================================
-- Auth helpers
-- ============================================================

create or replace function public.hr_is_branch_manager()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'branch_manager'
  )
$$;

create or replace function public.hr_managed_branch_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select b.id
  from public.hr_branches b
  join public.hr_employees e on e.id = b.manager_employee_id
  where e.line_user_id = hr_line_user_id()
  limit 1
$$;

create or replace function public.hr_employee_branch_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select branch_id from public.hr_employees where id = hr_employee_id()
$$;

create or replace function public.hr_can_access_branch(p_branch_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin()
    or (hr_is_branch_manager() and hr_managed_branch_id() = p_branch_id)
$$;

grant execute on function public.hr_is_branch_manager() to authenticated, service_role;
grant execute on function public.hr_managed_branch_id() to authenticated, service_role;
grant execute on function public.hr_employee_branch_id() to authenticated, service_role;
grant execute on function public.hr_can_access_branch(uuid) to authenticated, service_role;

-- ============================================================
-- Attendance submissions (daily approval)
-- ============================================================

create table if not exists public.hr_attendance_submissions (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null unique references public.hr_attendance (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  work_date date not null,
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approval_status text not null default 'pending_manager'
    check (approval_status in ('pending_manager', 'pending_hr', 'approved', 'rejected', 'expired')),
  manager_decided_by uuid references public.hr_employees (id),
  manager_decided_at timestamptz,
  hr_decided_by uuid references public.hr_employees (id),
  hr_decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create index if not exists hr_attendance_submissions_status_idx
  on public.hr_attendance_submissions (approval_status);
create index if not exists hr_attendance_submissions_employee_idx
  on public.hr_attendance_submissions (employee_id);

alter table public.hr_attendance_submissions enable row level security;

create policy hr_att_sub_select on public.hr_attendance_submissions
  for select using (
    employee_id = hr_employee_id()
    or hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

create policy hr_att_sub_insert on public.hr_attendance_submissions
  for insert with check (employee_id = hr_employee_id());

create policy hr_att_sub_update on public.hr_attendance_submissions
  for update using (
    hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

-- ============================================================
-- Leaves: two-tier approval + hourly sick + retro rules
-- ============================================================

alter table public.hr_leaves
  add column if not exists leave_unit text not null default 'days'
    check (leave_unit in ('days', 'hours')),
  add column if not exists leave_hours numeric(5,2),
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists approval_status text not null default 'pending_manager'
    check (approval_status in ('pending_manager', 'pending_hr', 'approved', 'rejected', 'expired')),
  add column if not exists manager_decided_by uuid references public.hr_employees (id),
  add column if not exists manager_decided_at timestamptz,
  add column if not exists hr_decided_by uuid references public.hr_employees (id),
  add column if not exists hr_decided_at timestamptz,
  add column if not exists medical_certificate_url text;

update public.hr_leaves
set approval_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'pending_manager'
end,
expires_at = coalesce(submitted_at, created_at) + interval '48 hours'
where expires_at is null;

-- ============================================================
-- Overtime: BM submits → pending_hr
-- ============================================================

alter table public.hr_overtime_requests
  add column if not exists submitted_by uuid references public.hr_employees (id),
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists approval_status text not null default 'pending_hr'
    check (approval_status in ('pending_hr', 'approved', 'rejected')),
  add column if not exists hr_decided_by uuid references public.hr_employees (id),
  add column if not exists hr_decided_at timestamptz;

update public.hr_overtime_requests
set approval_status = case
  when status = 'approved' then 'approved'
  when status = 'rejected' then 'rejected'
  else 'pending_hr'
end
where approval_status = 'pending_hr' and status <> 'pending';

drop policy if exists hr_overtime_insert on public.hr_overtime_requests;
create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (
    hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_select on public.hr_overtime_requests;
create policy hr_overtime_select on public.hr_overtime_requests
  for select using (
    employee_id = hr_employee_id()
    or hr_is_hr_admin()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_update on public.hr_overtime_requests;
create policy hr_overtime_update on public.hr_overtime_requests
  for update using (hr_is_hr_admin());

-- ============================================================
-- Payroll hours ledger
-- ============================================================

create table if not exists public.hr_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  branch_id uuid references public.hr_branches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (year, month, branch_id)
);

create table if not exists public.hr_payroll_hour_lines (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.hr_payroll_periods (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  line_type text not null check (line_type in ('regular', 'overtime', 'sick_hourly')),
  hours numeric(8,2) not null,
  work_date date not null,
  source_type text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists hr_payroll_hour_lines_period_idx on public.hr_payroll_hour_lines (period_id);

alter table public.hr_payroll_periods enable row level security;
alter table public.hr_payroll_hour_lines enable row level security;

create policy hr_payroll_periods_hr on public.hr_payroll_periods
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_payroll_lines_hr on public.hr_payroll_hour_lines
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- ============================================================
-- Branch RLS
-- ============================================================

alter table public.hr_branches enable row level security;

create policy hr_branches_select on public.hr_branches
  for select using (
    hr_is_hr_admin()
    or hr_is_branch_manager()
    or hr_employee_id() is not null
  );

create policy hr_branches_write on public.hr_branches
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_departments_select on public.hr_departments;
create policy hr_departments_select on public.hr_departments
  for select using (hr_is_hr_admin() or hr_employee_id() is not null or hr_is_branch_manager());

-- Leaves: manager can update pending_manager in their branch
drop policy if exists "leaves update hr only" on public.hr_leaves;
create policy hr_leaves_update on public.hr_leaves
  for update using (
    hr_is_hr_admin()
    or (
      hr_is_branch_manager()
      and approval_status = 'pending_manager'
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  );


-- Migration: 20260613010000_approval_expiry_cron.sql

-- T80: expire pending approvals past 48h SLA — hourly check

do $cron$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'supabase_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'approval-expiry cron skipped: vault secrets not set';
    return;
  end if;

  perform cron.unschedule('approval-expiry')
    where exists (select 1 from cron.job where jobname = 'approval-expiry');

  perform cron.schedule(
    'approval-expiry',
    '0 * * * *',
    format(
      $job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_url || '/functions/v1/approval-expiry',
      v_key,
      v_key
    )
  );
end;
$cron$;


-- Migration: 20260614000000_add_ceo_role.sql

-- CEO role: executive read-only company dashboard (separate from hr/admin)

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager', 'ceo'));

create or replace function public.hr_is_ceo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'ceo'
  )
$$;

create or replace function public.hr_can_read_company()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin() or hr_is_ceo()
$$;

grant execute on function public.hr_is_ceo() to authenticated, service_role;
grant execute on function public.hr_can_read_company() to authenticated, service_role;

-- Read policies for CEO dashboard aggregates
drop policy if exists "employees select self or hr" on public.hr_employees;
create policy "employees select self or hr" on public.hr_employees
  for select to authenticated
  using (id = hr_employee_id() or hr_can_read_company());

drop policy if exists "attendance select self or hr" on public.hr_attendance;
create policy "attendance select self or hr" on public.hr_attendance
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_can_read_company());

drop policy if exists "leaves select self or hr" on public.hr_leaves;
create policy "leaves select self or hr" on public.hr_leaves
  for select to authenticated
  using (employee_id = hr_employee_id() or hr_can_read_company());

drop policy if exists hr_att_sub_select on public.hr_attendance_submissions;
create policy hr_att_sub_select on public.hr_attendance_submissions
  for select using (
    employee_id = hr_employee_id()
    or hr_can_read_company()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_overtime_select on public.hr_overtime_requests;
create policy hr_overtime_select on public.hr_overtime_requests
  for select using (
    employee_id = hr_employee_id()
    or hr_can_read_company()
    or (hr_is_branch_manager() and employee_id in (
      select id from public.hr_employees where branch_id = hr_managed_branch_id()
    ))
  );

drop policy if exists hr_branches_select on public.hr_branches;
create policy hr_branches_select on public.hr_branches
  for select using (
    hr_can_read_company()
    or hr_is_branch_manager()
    or hr_employee_id() is not null
  );

drop policy if exists hr_payroll_periods_hr on public.hr_payroll_periods;
create policy hr_payroll_periods_select on public.hr_payroll_periods
  for select using (hr_can_read_company());
create policy hr_payroll_periods_write on public.hr_payroll_periods
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_payroll_lines_hr on public.hr_payroll_hour_lines;
create policy hr_payroll_lines_select on public.hr_payroll_hour_lines
  for select using (hr_can_read_company());
create policy hr_payroll_lines_write on public.hr_payroll_hour_lines
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

drop policy if exists hr_announcements_select on public.hr_announcements;
create policy hr_announcements_select on public.hr_announcements
  for select using (hr_can_read_company() or status = 'sent');

drop policy if exists hr_departments_select on public.hr_departments;
create policy hr_departments_select on public.hr_departments
  for select using (
    hr_can_read_company()
    or hr_employee_id() is not null
    or hr_is_branch_manager()
  );


-- Migration: 20260614100000_add_dev_role.sql

-- Dev role: full admin access for development / maintenance

alter table public.hr_employees drop constraint if exists hr_employees_role_check;
alter table public.hr_employees add constraint hr_employees_role_check
  check (role in ('employee', 'hr', 'admin', 'branch_manager', 'ceo', 'dev'));

create or replace function public.hr_is_dev()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'dev'
  )
$$;

create or replace function public.hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role in ('hr', 'admin', 'dev')
  )
$$;

create or replace function public.hr_can_read_company()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select hr_is_hr_admin() or hr_is_ceo()
$$;

grant execute on function public.hr_is_dev() to authenticated, service_role;


-- Migration: 20260615000000_approval_expiry_vault_align.sql

-- T76.1: align approval-expiry cron with vault secret names used by contract-alert
-- Rollback: SELECT cron.unschedule('approval-expiry');

do $cron$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null then
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'supabase_url' limit 1;
  end if;
  if v_key is null then
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  end if;

  if v_url is null or v_key is null then
    raise notice 'approval-expiry cron skipped: vault secrets not set (project_url + secret_key)';
    return;
  end if;

  perform cron.unschedule('approval-expiry')
    where exists (select 1 from cron.job where jobname = 'approval-expiry');

  perform cron.schedule(
    'approval-expiry',
    '0 * * * *',
    format(
      $job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_url || '/functions/v1/approval-expiry',
      v_key,
      v_key
    )
  );
end;
$cron$;


-- Migration: 20260616000000_overtime_two_tier_approval.sql

-- OT 2-tier approval: employee → branch manager → HR

alter table public.hr_overtime_requests
  add column if not exists manager_decided_by uuid references public.hr_employees (id),
  add column if not exists manager_decided_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_approval_status_check;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_approval_status_check
  check (
    approval_status in (
      'pending_manager',
      'pending_hr',
      'approved',
      'rejected',
      'expired'
    )
  );

update public.hr_overtime_requests
set expires_at = coalesce(submitted_at, created_at) + interval '48 hours'
where expires_at is null
  and approval_status in ('pending_manager', 'pending_hr');

drop policy if exists hr_overtime_insert on public.hr_overtime_requests;
create policy hr_overtime_insert on public.hr_overtime_requests
  for insert with check (
    hr_is_hr_admin()
    or employee_id = hr_employee_id()
    or (
      hr_is_branch_manager()
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  );

drop policy if exists hr_overtime_update on public.hr_overtime_requests;
create policy hr_overtime_update on public.hr_overtime_requests
  for update using (
    hr_is_hr_admin()
    or (
      hr_is_branch_manager()
      and approval_status = 'pending_manager'
      and employee_id in (
        select id from public.hr_employees where branch_id = hr_managed_branch_id()
      )
    )
  )
  with check (true);


-- Migration: 20260617000000_employee_code.sql

-- HR-assigned employee code (e.g. EMP-001), optional but unique when set

alter table public.hr_employees
  add column if not exists employee_code text;

create unique index if not exists hr_employees_employee_code_unique
  on public.hr_employees (lower(trim(employee_code)))
  where employee_code is not null and trim(employee_code) <> '';


-- Migration: 20260618000000_employee_bank_payment.sql

-- Employee bank account + salary payment method (cash vs bank transfer)

alter table public.hr_employees
  add column if not exists salary_payment_method text
    check (salary_payment_method is null or salary_payment_method in ('cash', 'bank')),
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch text;

comment on column public.hr_employees.salary_payment_method is 'cash = รับเงินสด, bank = โอนเข้าบัญชีธนาคาร';


-- Migration: 20260618100000_employee_leave_blacklist.sql

-- Leave blacklist: flag ex-employees HR must not re-approve / re-register

alter table public.hr_employees
  add column if not exists leave_blacklisted boolean not null default false,
  add column if not exists leave_blacklist_reason text,
  add column if not exists leave_blacklisted_at timestamptz;

alter table public.hr_compliance_notes
  drop constraint if exists hr_compliance_notes_category_check;

alter table public.hr_compliance_notes
  add constraint hr_compliance_notes_category_check
  check (category in ('probation', 'visa', 'work_permit', 'contract', 'blacklist'));


-- Migration: 20260618120000_head_office_it_developers.sql

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


-- Migration: 20260618130000_document_hold_reject.sql

-- Document requests: hold + reject statuses for HR actions

alter table public.hr_document_requests
  drop constraint if exists hr_document_requests_status_check;

alter table public.hr_document_requests
  add constraint hr_document_requests_status_check
  check (
    status in (
      'pending',
      'on_hold',
      'processing',
      'ready',
      'completed',
      'rejected'
    )
  );


-- Migration: 20260618140000_employee_permanent_delete_cascade.sql

-- Permanent employee delete: cascade child rows and allow HR to purge compliance/blacklist notes.

-- Core attendance / leave / alert rows should cascade when HR deletes an employee.
alter table public.hr_attendance
  drop constraint if exists hr_attendance_employee_id_fkey;

alter table public.hr_attendance
  add constraint hr_attendance_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_employee_id_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_approved_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_approved_by_fkey
  foreign key (approved_by) references public.hr_employees (id) on delete set null;

alter table public.hr_leave_balances
  drop constraint if exists hr_leave_balances_employee_id_fkey;

alter table public.hr_leave_balances
  add constraint hr_leave_balances_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

alter table public.hr_alerts
  drop constraint if exists hr_alerts_employee_id_fkey;

alter table public.hr_alerts
  add constraint hr_alerts_employee_id_fkey
  foreign key (employee_id) references public.hr_employees (id) on delete cascade;

-- HR complaint replies authored by the deleted employee (e.g. HR staff) must not block delete.
alter table public.hr_complaint_replies
  drop constraint if exists hr_complaint_replies_author_employee_id_fkey;

alter table public.hr_complaint_replies
  add constraint hr_complaint_replies_author_employee_id_fkey
  foreign key (author_employee_id) references public.hr_employees (id) on delete cascade;

-- Approval audit columns on other employees' rows should clear, not block delete.
alter table public.hr_leaves
  drop constraint if exists hr_leaves_manager_decided_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_leaves
  drop constraint if exists hr_leaves_hr_decided_by_fkey;

alter table public.hr_leaves
  add constraint hr_leaves_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_manager_decided_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_hr_decided_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_overtime_requests
  drop constraint if exists hr_overtime_requests_submitted_by_fkey;

alter table public.hr_overtime_requests
  add constraint hr_overtime_requests_submitted_by_fkey
  foreign key (submitted_by) references public.hr_employees (id) on delete set null;

alter table public.hr_attendance_submissions
  drop constraint if exists hr_attendance_submissions_manager_decided_by_fkey;

alter table public.hr_attendance_submissions
  add constraint hr_attendance_submissions_manager_decided_by_fkey
  foreign key (manager_decided_by) references public.hr_employees (id) on delete set null;

alter table public.hr_attendance_submissions
  drop constraint if exists hr_attendance_submissions_hr_decided_by_fkey;

alter table public.hr_attendance_submissions
  add constraint hr_attendance_submissions_hr_decided_by_fkey
  foreign key (hr_decided_by) references public.hr_employees (id) on delete set null;

-- RLS: cascaded deletes on compliance notes (incl. Leave Blacklist) require an HR delete policy.
drop policy if exists hr_compliance_notes_delete on public.hr_compliance_notes;

create policy hr_compliance_notes_delete on public.hr_compliance_notes
  for delete using (hr_is_hr_admin());

drop policy if exists hr_complaint_replies_delete on public.hr_complaint_replies;

create policy hr_complaint_replies_delete on public.hr_complaint_replies
  for delete using (hr_is_hr_admin());


-- Migration: 20260618150000_head_office_management_positions.sql

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


-- Migration: 20260618160000_head_office_flat_departments.sql

-- Head Office (000): promote sub-units to flat departments + default positions
-- Corrects 20260618150000 which nested HR Officer/Inventory/Accounting/Admin under Management

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

delete from public.hr_positions p
using public.hr_departments d
join public.hr_branches b on b.id = d.branch_id
where p.department_id = d.id
  and b.code = '000'
  and d.name = 'Management'
  and p.name in ('HR Officer', 'Inventory', 'Accounting', 'Admin');


-- Migration: 20260618170000_align_head_office_department_roles.sql

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


-- Migration: 20260618180000_branch_address.sql

alter table public.hr_branches
  add column if not exists address text;

comment on column public.hr_branches.address is 'ที่อยู่สาขา — แสดงใน Branch detail';


-- Migration: 20260620120000_announcement_images.sql

-- Announcement image attachments (HR upload, public read for portal + LINE)

alter table public.hr_announcements
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-announcements',
  'hr-announcements',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy hr_announcements_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-announcements'
    and hr_is_hr_admin()
  );

create policy hr_announcements_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-announcements'
    and hr_is_hr_admin()
  );

create policy hr_announcements_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-announcements'
    and hr_is_hr_admin()
  );


-- Migration: 20260620140000_employee_avatars.sql

-- Employee profile photos (HR upload or self-service via API)

alter table public.hr_employees
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-avatars',
  'hr-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy hr_avatars_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-avatars'
    and (
      hr_is_hr_admin()
      or (
        hr_employee_id() is not null
        and split_part(name, '/', 1) = hr_employee_id()::text
      )
    )
  );

create policy hr_avatars_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-avatars'
    and (
      hr_is_hr_admin()
      or (
        hr_employee_id() is not null
        and split_part(name, '/', 1) = hr_employee_id()::text
      )
    )
  );

create policy hr_avatars_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-avatars'
    and (
      hr_is_hr_admin()
      or (
        hr_employee_id() is not null
        and split_part(name, '/', 1) = hr_employee_id()::text
      )
    )
  );


-- Migration: 20260620150000_employee_contracts.sql

-- Employment contract file attachments (HR upload, private storage)

alter table public.hr_employees
  add column if not exists contract_file_path text,
  add column if not exists contract_file_name text,
  add column if not exists contract_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-contracts',
  'hr-contracts',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy hr_contracts_storage_select on storage.objects
  for select using (
    bucket_id = 'hr-contracts'
    and (hr_is_hr_admin() or hr_is_ceo())
  );

create policy hr_contracts_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-contracts'
    and hr_is_hr_admin()
  );

create policy hr_contracts_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-contracts'
    and hr_is_hr_admin()
  );

create policy hr_contracts_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-contracts'
    and hr_is_hr_admin()
  );


-- Migration: 20260622100000_inventory_schema.sql

-- Inventory module (inv_* prefix — separate from hr_branches)

create table if not exists public.inv_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  from_unit_id uuid references public.inv_units (id) on delete cascade,
  to_unit_id uuid references public.inv_units (id) on delete cascade,
  factor numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_skus (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  unit_id uuid references public.inv_units (id),
  barcode text,
  min_stock numeric not null default 0,
  max_stock numeric not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  branch_id uuid not null references public.inv_branches (id) on delete cascade,
  type text not null default 'main' check (type in ('main', 'sub')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_boms (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid references public.inv_skus (id) on delete cascade,
  ingredient_sku_id uuid references public.inv_skus (id) on delete cascade,
  quantity numeric not null,
  unit_id uuid references public.inv_units (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_stock_balances (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete cascade,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete cascade,
  quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sku_id, warehouse_id)
);

create table if not exists public.inv_inbound_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.inv_suppliers (id),
  warehouse_id uuid references public.inv_warehouses (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled')),
  received_date timestamptz,
  notes text,
  created_by uuid references public.hr_employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_inbound_items (
  id uuid primary key default gen_random_uuid(),
  inbound_order_id uuid not null references public.inv_inbound_orders (id) on delete cascade,
  sku_id uuid references public.inv_skus (id),
  quantity numeric not null,
  cost_per_unit numeric,
  lot_number text,
  expiry_date date,
  created_at timestamptz not null default now()
);

create trigger inv_skus_set_updated_at
  before update on public.inv_skus
  for each row execute function public.hr_set_updated_at();

create trigger inv_suppliers_set_updated_at
  before update on public.inv_suppliers
  for each row execute function public.hr_set_updated_at();

create trigger inv_branches_set_updated_at
  before update on public.inv_branches
  for each row execute function public.hr_set_updated_at();

create trigger inv_warehouses_set_updated_at
  before update on public.inv_warehouses
  for each row execute function public.hr_set_updated_at();

create trigger inv_stock_balances_set_updated_at
  before update on public.inv_stock_balances
  for each row execute function public.hr_set_updated_at();

create trigger inv_inbound_orders_set_updated_at
  before update on public.inv_inbound_orders
  for each row execute function public.hr_set_updated_at();

insert into public.inv_units (name, abbreviation)
values
  ('ชิ้น', 'pcs'),
  ('กิโลกรัม', 'kg'),
  ('กรัม', 'g'),
  ('ลิตร', 'L'),
  ('มิลลิลิตร', 'ml'),
  ('แพ็ค', 'pack'),
  ('ถุง', 'bag'),
  ('กล่อง', 'box')
on conflict do nothing;

-- RLS: active employees read; HR admin write
alter table public.inv_units enable row level security;
alter table public.inv_unit_conversions enable row level security;
alter table public.inv_skus enable row level security;
alter table public.inv_suppliers enable row level security;
alter table public.inv_branches enable row level security;
alter table public.inv_warehouses enable row level security;
alter table public.inv_boms enable row level security;
alter table public.inv_stock_balances enable row level security;
alter table public.inv_inbound_orders enable row level security;
alter table public.inv_inbound_items enable row level security;

create policy inv_units_select on public.inv_units
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_units_write on public.inv_units
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_unit_conversions_select on public.inv_unit_conversions
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_unit_conversions_write on public.inv_unit_conversions
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_skus_select on public.inv_skus
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_skus_write on public.inv_skus
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_suppliers_select on public.inv_suppliers
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_suppliers_write on public.inv_suppliers
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_branches_select on public.inv_branches
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_branches_write on public.inv_branches
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_warehouses_select on public.inv_warehouses
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_warehouses_write on public.inv_warehouses
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_boms_select on public.inv_boms
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_boms_write on public.inv_boms
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_stock_balances_select on public.inv_stock_balances
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_stock_balances_write on public.inv_stock_balances
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_inbound_orders_select on public.inv_inbound_orders
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_inbound_orders_write on public.inv_inbound_orders
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_inbound_items_select on public.inv_inbound_items
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_inbound_items_write on public.inv_inbound_items
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());


-- Migration: 20260613120000_inv_requisitions.sql

-- T138: Kitchen requisition workflow

create or replace function public.inv_can_manage_requisitions()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'admin', 'dev', 'ceo')
  )
$$;

revoke execute on function public.inv_can_manage_requisitions() from public, anon;
grant execute on function public.inv_can_manage_requisitions() to authenticated, service_role;

create table if not exists public.inv_requisitions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  requester_id uuid not null references public.hr_employees (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'issued', 'completed', 'rejected')),
  notes text,
  rejection_reason text,
  approved_by uuid references public.hr_employees (id) on delete set null,
  approved_at timestamptz,
  issued_by uuid references public.hr_employees (id) on delete set null,
  issued_at timestamptz,
  received_by uuid references public.hr_employees (id) on delete set null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.inv_requisitions (id) on delete cascade,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty_requested numeric not null check (qty_requested > 0),
  qty_approved numeric not null default 0 check (qty_approved >= 0),
  qty_issued numeric not null default 0 check (qty_issued >= 0),
  qty_received numeric not null default 0 check (qty_received >= 0),
  lot_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_req_items_qty_approved_lte_requested
    check (qty_approved <= qty_requested),
  constraint inv_req_items_qty_issued_lte_approved
    check (qty_issued <= qty_approved),
  constraint inv_req_items_qty_received_lte_issued
    check (qty_received <= qty_issued)
);

create table if not exists public.inv_stock_movements (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  movement_type text not null,
  quantity numeric not null,
  reference_type text,
  reference_id uuid,
  lot_number text,
  created_by uuid references public.hr_employees (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint inv_stock_movements_quantity_nonzero check (quantity <> 0)
);

create index if not exists inv_requisitions_requester_created_idx
  on public.inv_requisitions (requester_id, created_at desc);
create index if not exists inv_requisitions_status_created_idx
  on public.inv_requisitions (status, created_at desc);
create index if not exists inv_requisitions_branch_status_idx
  on public.inv_requisitions (branch_id, status);
create index if not exists inv_requisitions_warehouse_status_idx
  on public.inv_requisitions (warehouse_id, status);
create index if not exists inv_requisition_items_requisition_idx
  on public.inv_requisition_items (requisition_id);
create index if not exists inv_requisition_items_sku_idx
  on public.inv_requisition_items (sku_id);
create index if not exists inv_requisition_items_lot_idx
  on public.inv_requisition_items (lot_number);
create index if not exists inv_stock_movements_sku_created_idx
  on public.inv_stock_movements (sku_id, created_at desc);
create index if not exists inv_stock_movements_warehouse_created_idx
  on public.inv_stock_movements (warehouse_id, created_at desc);
create index if not exists inv_stock_movements_reference_idx
  on public.inv_stock_movements (reference_type, reference_id);

drop trigger if exists inv_requisitions_set_updated_at on public.inv_requisitions;
create trigger inv_requisitions_set_updated_at
  before update on public.inv_requisitions
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_requisition_items_set_updated_at on public.inv_requisition_items;
create trigger inv_requisition_items_set_updated_at
  before update on public.inv_requisition_items
  for each row execute function public.hr_set_updated_at();

alter table public.inv_requisitions enable row level security;
alter table public.inv_requisition_items enable row level security;
alter table public.inv_stock_movements enable row level security;

drop policy if exists inv_requisitions_select on public.inv_requisitions;
create policy inv_requisitions_select on public.inv_requisitions
  for select using (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  );

drop policy if exists inv_requisitions_insert on public.inv_requisitions;
create policy inv_requisitions_insert on public.inv_requisitions
  for insert with check (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  );

drop policy if exists inv_requisitions_update on public.inv_requisitions;
create policy inv_requisitions_update on public.inv_requisitions
  for update using (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  )
  with check (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  );

drop policy if exists inv_requisition_items_select on public.inv_requisition_items;
create policy inv_requisition_items_select on public.inv_requisition_items
  for select using (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_requisition_items_insert on public.inv_requisition_items;
create policy inv_requisition_items_insert on public.inv_requisition_items
  for insert with check (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_requisition_items_update on public.inv_requisition_items;
create policy inv_requisition_items_update on public.inv_requisition_items
  for update using (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_stock_movements_select on public.inv_stock_movements;
create policy inv_stock_movements_select on public.inv_stock_movements
  for select using (
    public.inv_can_manage_requisitions()
    or public.hr_employee_id() is not null
  );

drop policy if exists inv_stock_movements_insert on public.inv_stock_movements;
create policy inv_stock_movements_insert on public.inv_stock_movements
  for insert with check (public.inv_can_manage_requisitions());

create or replace function public.inv_issue_requisition(
  p_requisition_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_requisition public.inv_requisitions%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_qty_issued numeric;
  v_lot_number text;
  v_req_item public.inv_requisition_items%rowtype;
  v_stock_qty numeric;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'issued items required';
  end if;

  select * into v_requisition
  from public.inv_requisitions
  where id = p_requisition_id
  for update;

  if not found then
    raise exception 'requisition not found';
  end if;

  if v_requisition.status <> 'approved' then
    raise exception 'requisition must be approved to issue';
  end if;

  for v_req_item in
    select *
    from public.inv_requisition_items
    where requisition_id = p_requisition_id
      and qty_approved > 0
    for update
  loop
    v_item := null;
    v_stock_qty := null;

    select item into v_item
    from jsonb_array_elements(p_items) item
    where (item ->> 'id')::uuid = v_req_item.id
    limit 1;

    if v_item is null then
      raise exception 'missing issued quantity for item %', v_req_item.id;
    end if;

    v_item_id := (v_item ->> 'id')::uuid;
    v_qty_issued := (v_item ->> 'qty_issued')::numeric;
    v_lot_number := nullif(trim(v_item ->> 'lot_number'), '');

    if v_item_id <> v_req_item.id then
      raise exception 'invalid issued item';
    end if;

    if v_qty_issued <= 0 or v_qty_issued > v_req_item.qty_approved then
      raise exception 'issued quantity exceeds approved quantity';
    end if;

    if v_lot_number is null then
      raise exception 'lot number required';
    end if;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_req_item.sku_id
      and warehouse_id = v_requisition.warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_qty_issued then
      raise exception 'insufficient stock';
    end if;

    update public.inv_stock_balances
    set quantity = quantity - v_qty_issued,
        updated_at = now()
    where sku_id = v_req_item.sku_id
      and warehouse_id = v_requisition.warehouse_id;

    update public.inv_requisition_items
    set qty_issued = v_qty_issued,
        lot_number = v_lot_number
    where id = v_req_item.id;

    insert into public.inv_stock_movements (
      sku_id,
      warehouse_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      lot_number,
      created_by,
      notes
    )
    values (
      v_req_item.sku_id,
      v_requisition.warehouse_id,
      'requisition_issue',
      -v_qty_issued,
      'requisition',
      p_requisition_id,
      v_lot_number,
      v_actor_id,
      'Kitchen requisition issue'
    );
  end loop;

  update public.inv_requisitions
  set status = 'issued',
      issued_by = v_actor_id,
      issued_at = now()
  where id = p_requisition_id;
end;
$$;

revoke all on function public.inv_issue_requisition(uuid, jsonb) from public;
grant execute on function public.inv_issue_requisition(uuid, jsonb) to authenticated;


-- Migration: 20260613140000_inv_consumption_damage.sql

-- T140: Consumption and damage tracking

create or replace function public.inv_can_manage_damage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'admin', 'dev', 'ceo')
  )
$$;

revoke execute on function public.inv_can_manage_damage() from public, anon;
grant execute on function public.inv_can_manage_damage() to authenticated, service_role;

create or replace function public.inv_can_admin_damage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('admin', 'dev')
  )
$$;

revoke execute on function public.inv_can_admin_damage() from public, anon;
grant execute on function public.inv_can_admin_damage() to authenticated, service_role;

create or replace function public.inv_can_approve_damage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'admin', 'dev')
  )
$$;

revoke execute on function public.inv_can_approve_damage() from public, anon;
grant execute on function public.inv_can_approve_damage() to authenticated, service_role;

create or replace function public.inv_is_active_employee()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
  )
$$;

revoke execute on function public.inv_is_active_employee() from public, anon;
grant execute on function public.inv_is_active_employee() to authenticated, service_role;

create or replace function public.inv_latest_sku_cost(p_sku_id uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
  select i.cost_per_unit
  from public.inv_inbound_items i
  join public.inv_inbound_orders o on o.id = i.inbound_order_id
  where i.sku_id = p_sku_id
    and i.cost_per_unit is not null
    and i.cost_per_unit >= 0
    and o.status = 'approved'
  order by coalesce(o.received_date, o.updated_at, o.created_at) desc, i.created_at desc
  limit 1
$$;

revoke execute on function public.inv_latest_sku_cost(uuid) from public, anon;
grant execute on function public.inv_latest_sku_cost(uuid) to authenticated, service_role;

create table if not exists public.inv_stock_movements (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  movement_type text not null,
  quantity numeric not null,
  reference_type text,
  reference_id uuid,
  lot_number text,
  created_by uuid references public.hr_employees (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint inv_stock_movements_quantity_nonzero check (quantity <> 0)
);

create table if not exists public.inv_consumptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty numeric not null check (qty > 0),
  consumption_type text not null check (consumption_type in ('production', 'sampling', 'testing')),
  recorded_by uuid not null references public.hr_employees (id) on delete restrict,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_damages (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty numeric not null check (qty > 0),
  damage_type text not null check (damage_type in ('damaged', 'spoiled', 'expired', 'lost', 'adjustment')),
  reason text not null check (length(trim(reason)) > 0),
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  cost_value numeric not null check (cost_value >= 0),
  approval_required_role text not null default 'hr' check (approval_required_role in ('auto', 'hr', 'admin')),
  auto_approved boolean not null default false,
  approver_id uuid references public.hr_employees (id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_by uuid not null references public.hr_employees (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text,
  constraint inv_damages_approved_has_approver
    check (status <> 'approved' or (approver_id is not null and approved_at is not null)),
  constraint inv_damages_rejected_has_timestamp
    check (status <> 'rejected' or rejected_at is not null),
  constraint inv_damages_pending_has_no_decision
    check (status <> 'pending' or (approved_at is null and rejected_at is null))
);

create index if not exists inv_stock_movements_sku_created_idx
  on public.inv_stock_movements (sku_id, created_at desc);
create index if not exists inv_stock_movements_warehouse_created_idx
  on public.inv_stock_movements (warehouse_id, created_at desc);
create index if not exists inv_stock_movements_reference_idx
  on public.inv_stock_movements (reference_type, reference_id);

create index if not exists inv_consumptions_recorded_created_idx
  on public.inv_consumptions (recorded_by, recorded_at desc);
create index if not exists inv_consumptions_branch_recorded_idx
  on public.inv_consumptions (branch_id, recorded_at desc);
create index if not exists inv_consumptions_warehouse_recorded_idx
  on public.inv_consumptions (warehouse_id, recorded_at desc);
create index if not exists inv_consumptions_sku_recorded_idx
  on public.inv_consumptions (sku_id, recorded_at desc);
create index if not exists inv_consumptions_type_recorded_idx
  on public.inv_consumptions (consumption_type, recorded_at desc);

create index if not exists inv_damages_status_created_idx
  on public.inv_damages (status, created_at desc);
create index if not exists inv_damages_branch_status_idx
  on public.inv_damages (branch_id, status);
create index if not exists inv_damages_warehouse_status_idx
  on public.inv_damages (warehouse_id, status);
create index if not exists inv_damages_sku_created_idx
  on public.inv_damages (sku_id, created_at desc);
create index if not exists inv_damages_created_by_idx
  on public.inv_damages (created_by, created_at desc);
create index if not exists inv_damages_approval_role_idx
  on public.inv_damages (approval_required_role, status);

drop trigger if exists inv_damages_set_updated_at on public.inv_damages;
create trigger inv_damages_set_updated_at
  before update on public.inv_damages
  for each row execute function public.hr_set_updated_at();

alter table public.inv_consumptions enable row level security;
alter table public.inv_damages enable row level security;
alter table public.inv_stock_movements enable row level security;

drop policy if exists inv_consumptions_select on public.inv_consumptions;
create policy inv_consumptions_select on public.inv_consumptions
  for select using (
    recorded_by = public.hr_employee_id()
    or public.inv_can_manage_damage()
  );

drop policy if exists inv_consumptions_insert on public.inv_consumptions;
create policy inv_consumptions_insert on public.inv_consumptions
  for insert with check (
    recorded_by = public.hr_employee_id()
    and public.inv_is_active_employee()
  );

drop policy if exists inv_damages_select on public.inv_damages;
create policy inv_damages_select on public.inv_damages
  for select using (
    created_by = public.hr_employee_id()
    or public.inv_can_manage_damage()
  );

drop policy if exists inv_damages_insert on public.inv_damages;
create policy inv_damages_insert on public.inv_damages
  for insert with check (
    created_by = public.hr_employee_id()
    and public.inv_is_active_employee()
  );

drop policy if exists inv_damages_update on public.inv_damages;
create policy inv_damages_update on public.inv_damages
  for update using (public.inv_can_manage_damage())
  with check (public.inv_can_manage_damage());

drop policy if exists inv_stock_movements_select on public.inv_stock_movements;
create policy inv_stock_movements_select on public.inv_stock_movements
  for select using (
    public.inv_can_manage_damage()
    or public.hr_employee_id() is not null
  );

drop policy if exists inv_stock_movements_insert on public.inv_stock_movements;
create policy inv_stock_movements_insert on public.inv_stock_movements
  for insert with check (public.inv_can_manage_damage());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventory-damage-photos',
  'inventory-damage-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inventory damage photos insert own folder" on storage.objects;
create policy "inventory damage photos insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inventory-damage-photos'
    and (storage.foldername(name))[1] = public.hr_employee_id()::text
    and public.inv_is_active_employee()
  );

drop policy if exists "inventory damage photos select own or manager" on storage.objects;
create policy "inventory damage photos select own or manager"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  );

drop policy if exists "inventory damage photos update own or manager" on storage.objects;
create policy "inventory damage photos update own or manager"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  )
  with check (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  );

create or replace function public.inv_validate_branch_warehouse(
  p_branch_id uuid,
  p_warehouse_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.inv_warehouses w
    where w.id = p_warehouse_id
      and w.branch_id = p_branch_id
      and w.is_active = true
  ) then
    raise exception 'warehouse does not belong to branch';
  end if;
end;
$$;

revoke all on function public.inv_validate_branch_warehouse(uuid, uuid) from public;
grant execute on function public.inv_validate_branch_warehouse(uuid, uuid) to authenticated, service_role;

create or replace function public.inv_record_consumption(
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item jsonb;
  v_sku_id uuid;
  v_qty numeric;
  v_type text;
  v_notes text;
  v_stock_qty numeric;
  v_consumption_id uuid;
  v_ids uuid[] := '{}';
begin
  if not public.inv_is_active_employee() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'consumption items required';
  end if;

  perform public.inv_validate_branch_warehouse(p_branch_id, p_warehouse_id);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_sku_id := (v_item ->> 'sku_id')::uuid;
    v_qty := (v_item ->> 'qty')::numeric;
    v_type := v_item ->> 'consumption_type';
    v_notes := nullif(trim(coalesce(v_item ->> 'notes', '')), '');

    if v_qty <= 0 then
      raise exception 'quantity must be positive';
    end if;
    if v_type not in ('production', 'sampling', 'testing') then
      raise exception 'invalid consumption type';
    end if;
    if not exists (select 1 from public.inv_skus s where s.id = v_sku_id and s.is_active = true) then
      raise exception 'sku not active';
    end if;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_sku_id
      and warehouse_id = p_warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_qty then
      raise exception 'insufficient stock';
    end if;

    insert into public.inv_consumptions (
      branch_id,
      warehouse_id,
      sku_id,
      qty,
      consumption_type,
      recorded_by,
      notes
    )
    values (
      p_branch_id,
      p_warehouse_id,
      v_sku_id,
      v_qty,
      v_type,
      v_actor_id,
      coalesce(v_notes, nullif(trim(coalesce(p_notes, '')), ''))
    )
    returning id into v_consumption_id;

    update public.inv_stock_balances
    set quantity = quantity - v_qty,
        updated_at = now()
    where sku_id = v_sku_id
      and warehouse_id = p_warehouse_id;

    insert into public.inv_stock_movements (
      sku_id,
      warehouse_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      created_by,
      notes
    )
    values (
      v_sku_id,
      p_warehouse_id,
      'consumption',
      -v_qty,
      'consumption',
      v_consumption_id,
      v_actor_id,
      coalesce(v_notes, p_notes, 'Inventory consumption')
    );

    v_ids := array_append(v_ids, v_consumption_id);
  end loop;

  return v_ids;
end;
$$;

revoke all on function public.inv_record_consumption(uuid, uuid, jsonb, text) from public;
grant execute on function public.inv_record_consumption(uuid, uuid, jsonb, text) to authenticated;

create or replace function public.inv_approve_damage(p_damage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_damage public.inv_damages%rowtype;
  v_stock_qty numeric;
begin
  select * into v_damage
  from public.inv_damages
  where id = p_damage_id
  for update;

  if not found then
    raise exception 'damage report not found';
  end if;
  if v_damage.status <> 'pending' then
    raise exception 'damage report must be pending';
  end if;
  if v_damage.approval_required_role = 'auto' then
    if v_damage.created_by <> public.hr_employee_id()
      and not public.inv_can_approve_damage()
    then
      raise exception 'forbidden';
    end if;
  elsif not public.inv_can_approve_damage() then
    raise exception 'forbidden';
  end if;
  if v_damage.approval_required_role = 'admin' and not public.inv_can_admin_damage() then
    raise exception 'admin approval required';
  end if;

  v_actor_id := public.hr_employee_id();

  select quantity into v_stock_qty
  from public.inv_stock_balances
  where sku_id = v_damage.sku_id
    and warehouse_id = v_damage.warehouse_id
  for update;

  if coalesce(v_stock_qty, 0) < v_damage.qty then
    raise exception 'insufficient stock';
  end if;

  update public.inv_stock_balances
  set quantity = quantity - v_damage.qty,
      updated_at = now()
  where sku_id = v_damage.sku_id
    and warehouse_id = v_damage.warehouse_id;

  update public.inv_damages
  set status = 'approved',
      approver_id = v_actor_id,
      approved_at = now(),
      rejected_at = null,
      rejection_reason = null
  where id = p_damage_id;

  insert into public.inv_stock_movements (
    sku_id,
    warehouse_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    created_by,
    notes
  )
  values (
    v_damage.sku_id,
    v_damage.warehouse_id,
    'damage',
    -v_damage.qty,
    'damage',
    p_damage_id,
    v_actor_id,
    'Inventory damage approved'
  );
end;
$$;

revoke all on function public.inv_approve_damage(uuid) from public;
grant execute on function public.inv_approve_damage(uuid) to authenticated;

create or replace function public.inv_reject_damage(
  p_damage_id uuid,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_damage public.inv_damages%rowtype;
begin
  if not public.inv_can_approve_damage() then
    raise exception 'forbidden';
  end if;

  select * into v_damage
  from public.inv_damages
  where id = p_damage_id
  for update;

  if not found then
    raise exception 'damage report not found';
  end if;
  if v_damage.status <> 'pending' then
    raise exception 'damage report must be pending';
  end if;
  if v_damage.approval_required_role = 'admin' and not public.inv_can_admin_damage() then
    raise exception 'admin approval required';
  end if;

  v_actor_id := public.hr_employee_id();

  update public.inv_damages
  set status = 'rejected',
      approver_id = v_actor_id,
      rejected_at = now(),
      approved_at = null,
      rejection_reason = nullif(trim(p_rejection_reason), '')
  where id = p_damage_id;
end;
$$;

revoke all on function public.inv_reject_damage(uuid, text) from public;
grant execute on function public.inv_reject_damage(uuid, text) to authenticated;


-- Migration: 20260613190000_employee_default_times.sql

-- Migration: Add default check-in / check-out time columns to hr_employees
-- Task: T150 — Fix Default Check-in/Check-out Time Backend Implementation
-- These fields allow HR to set per-employee default attendance times
-- when no fixed work shift (work_shift_id) is assigned.

ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS default_check_in_time  time,
  ADD COLUMN IF NOT EXISTS default_check_out_time time;

COMMENT ON COLUMN hr_employees.default_check_in_time  IS 'Employee-level default check-in time. Used as attendance fallback when no shift is assigned.';
COMMENT ON COLUMN hr_employees.default_check_out_time IS 'Employee-level default check-out time. Used as attendance fallback when no shift is assigned.';


-- Migration: 20260623100000_work_shifts.sql

-- Work shifts: master schedules + employee assignment (Phase 1 schema)

create table if not exists public.hr_work_shifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_hour smallint not null check (start_hour between 0 and 23),
  start_minute smallint not null default 0 check (start_minute between 0 and 59),
  end_hour smallint not null check (end_hour between 0 and 23),
  end_minute smallint not null default 0 check (end_minute between 0 and 59),
  crosses_midnight boolean not null default false,
  grace_minutes smallint not null default 10 check (grace_minutes between 0 and 120),
  standard_hours numeric(4, 2) not null check (standard_hours > 0 and standard_hours <= 24),
  check_in_early_minutes smallint not null default 60 check (check_in_early_minutes between 0 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hr_work_shifts_set_updated_at
  before update on public.hr_work_shifts
  for each row execute function public.hr_set_updated_at();

alter table public.hr_employees
  add column if not exists work_shift_id uuid references public.hr_work_shifts (id) on delete set null;

create index if not exists hr_employees_work_shift_id_idx
  on public.hr_employees (work_shift_id);

alter table public.hr_attendance
  add column if not exists work_shift_id uuid references public.hr_work_shifts (id) on delete set null,
  add column if not exists shift_date date;

create index if not exists hr_attendance_work_shift_id_idx
  on public.hr_attendance (work_shift_id);

create index if not exists hr_attendance_shift_date_idx
  on public.hr_attendance (shift_date);

-- Seed company shift templates
insert into public.hr_work_shifts (
  code,
  name,
  start_hour,
  start_minute,
  end_hour,
  end_minute,
  crosses_midnight,
  grace_minutes,
  standard_hours,
  check_in_early_minutes
)
values
  (
    'OFFICE',
    'Office 11:00–20:00',
    11,
    0,
    20,
    0,
    false,
    10,
    9.00,
    60
  ),
  (
    'BRANCH_MGR',
    'Branch Manager 10:00–22:00',
    10,
    0,
    22,
    0,
    false,
    10,
    10.00,
    60
  ),
  (
    'BRANCH_DAY',
    'Branch Day 10:00–22:00',
    10,
    0,
    22,
    0,
    false,
    10,
    10.00,
    60
  ),
  (
    'BRANCH_NIGHT',
    'Branch Night 14:00–02:00',
    14,
    0,
    2,
    0,
    true,
    10,
    10.00,
    60
  )
on conflict (code) do nothing;

alter table public.hr_work_shifts enable row level security;

create policy hr_work_shifts_select on public.hr_work_shifts
  for select using (
    hr_is_hr_admin()
    or hr_is_ceo()
    or hr_employee_id() is not null
  );

create policy hr_work_shifts_write on public.hr_work_shifts
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

comment on table public.hr_work_shifts is 'Master work shift templates for attendance late/OT rules';
comment on column public.hr_employees.work_shift_id is 'HR-assigned shift; used by check-in/out (Phase 3)';
comment on column public.hr_attendance.work_shift_id is 'Shift snapshot at check-in';
comment on column public.hr_attendance.shift_date is 'Logical shift day (important for overnight shifts)';


-- Migration: 20260624100000_inventory_demo_seed.sql

-- Demo seed for inventory UAT (idempotent — safe to re-run)
-- Phase 1.5: 1 branch → 1 warehouse → supplier → sample SKUs + stock balances

insert into public.inv_branches (code, name, address, is_active)
values ('DEMO-HQ', 'Demo สาขาหลัก', 'Bangkok — UAT seed', true)
on conflict (code) do nothing;

insert into public.inv_suppliers (code, name, contact, is_active)
values ('SUP-DEMO', 'Demo Supplier Co.', 'demo@supplier.local', true)
on conflict (code) do nothing;

insert into public.inv_warehouses (code, name, branch_id, type, is_active)
select
  'WH-DEMO',
  'Demo Main Warehouse',
  b.id,
  'main',
  true
from public.inv_branches b
where b.code = 'DEMO-HQ'
on conflict (code) do nothing;

insert into public.inv_skus (code, name, category, unit_id, barcode, min_stock, max_stock, is_active)
select v.code, v.name, v.category, u.id, v.barcode, v.min_stock, v.max_stock, true
from (
  values
    ('SKU-DEMO-001', 'Demo น้ำจิ้ม', 'Sauce', '8850000000001', 10::numeric, 100::numeric),
    ('SKU-DEMO-002', 'Demo หมูสับ', 'Meat', '8850000000002', 5::numeric, 50::numeric),
    ('SKU-DEMO-003', 'Demo ผักรวม', 'Vegetable', '8850000000003', 8::numeric, 80::numeric),
    ('SKU-DEMO-004', 'Demo กล่องใส่อาหาร', 'Packaging', '8850000000004', 20::numeric, 200::numeric),
    ('SKU-DEMO-005', 'Demo น้ำดื่ม', 'Beverage', '8850000000005', 15::numeric, 150::numeric)
) as v(code, name, category, barcode, min_stock, max_stock)
cross join lateral (
  select id from public.inv_units where abbreviation = 'pcs' limit 1
) u
on conflict (code) do nothing;

insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
select s.id, w.id, v.qty
from (
  values
    ('SKU-DEMO-001', 3::numeric),
    ('SKU-DEMO-002', 2::numeric),
    ('SKU-DEMO-003', 12::numeric),
    ('SKU-DEMO-004', 0::numeric),
    ('SKU-DEMO-005', 25::numeric)
) as v(sku_code, qty)
join public.inv_skus s on s.code = v.sku_code
join public.inv_warehouses w on w.code = 'WH-DEMO'
on conflict (sku_id, warehouse_id) do update
  set quantity = excluded.quantity,
      updated_at = now();


-- Migration: 20260625100000_inbound_phase4.sql

-- T134: Inbound Phase 4 — draft status + approve RPC (stock increment)

alter table public.inv_inbound_orders
  drop constraint if exists inv_inbound_orders_status_check;

alter table public.inv_inbound_orders
  add constraint inv_inbound_orders_status_check
  check (status in ('draft', 'pending', 'approved', 'cancelled'));

alter table public.inv_inbound_orders
  alter column status set default 'draft';

create or replace function public.inv_approve_inbound_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.inv_inbound_orders%rowtype;
  v_item public.inv_inbound_items%rowtype;
begin
  if not public.hr_is_hr_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_order
  from public.inv_inbound_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'inbound order not found';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order must be pending to approve';
  end if;

  if v_order.warehouse_id is null then
    raise exception 'warehouse required';
  end if;

  for v_item in
    select * from public.inv_inbound_items
    where inbound_order_id = p_order_id
  loop
    if v_item.sku_id is null or v_item.quantity <= 0 then
      continue;
    end if;

    insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
    values (v_item.sku_id, v_order.warehouse_id, v_item.quantity)
    on conflict (sku_id, warehouse_id) do update
      set quantity = public.inv_stock_balances.quantity + excluded.quantity,
          updated_at = now();
  end loop;

  update public.inv_inbound_orders
  set
    status = 'approved',
    received_date = coalesce(received_date, now()),
    updated_at = now()
  where id = p_order_id;
end;
$$;

revoke all on function public.inv_approve_inbound_order(uuid) from public;
grant execute on function public.inv_approve_inbound_order(uuid) to authenticated;


-- DATA IMPORT

-- HR Data INSERT Statements
-- Generated for migration to cpyuibcrpfslgcazozid
-- IMPORTANT: Run ALL_MIGRATIONS_CONSOLIDATED.sql first!


SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict yPusyhuogHglOv0Z7rx8JVwUx8MbMA4cOr9dgNA1acGfYFM9OXd6zskqcDcInYA

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: hr_work_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_work_shifts" ("id", "code", "name", "start_hour", "start_minute", "end_hour", "end_minute", "crosses_midnight", "grace_minutes", "standard_hours", "check_in_early_minutes", "is_active", "created_at", "updated_at") VALUES
	('0f46108a-ba89-407d-a3cc-a185ad7b7822', 'OFFICE', 'Office 11:00–20:00', 11, 0, 20, 0, false, 10, 9.00, 60, true, '2026-06-12 13:42:46.13803+00', '2026-06-12 13:42:46.13803+00'),
	('64954753-d91a-4f16-a60a-8ec46fb1cc04', 'BRANCH_MGR', 'Branch Manager 10:00–22:00', 10, 0, 22, 0, false, 10, 10.00, 60, true, '2026-06-12 13:42:46.13803+00', '2026-06-12 13:42:46.13803+00'),
	('89fcc386-c2e5-4623-a089-0128edbdf8f5', 'BRANCH_DAY', 'Branch Day 10:00–22:00', 10, 0, 22, 0, false, 10, 10.00, 60, true, '2026-06-12 13:42:46.13803+00', '2026-06-12 13:42:46.13803+00'),
	('1034f74f-a608-45ac-8025-8951d614c44f', 'BRANCH_NIGHT', 'Branch Night 14:00–02:00', 14, 0, 2, 0, true, 10, 10.00, 60, true, '2026-06-12 13:42:46.13803+00', '2026-06-12 13:42:46.13803+00');


--
-- Data for Name: hr_employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_employees" ("id", "line_user_id", "name", "position", "department", "salary", "contract_start", "probation_end", "visa_expiry", "work_permit_expiry", "role", "status", "created_at", "updated_at", "date_of_birth", "phone", "email", "contract_type", "contract_end", "probation_outcome", "probation_outcome_note", "probation_extended_until", "branch_id", "department_id", "employee_code", "salary_payment_method", "bank_name", "bank_account_name", "bank_account_number", "bank_branch", "leave_blacklisted", "leave_blacklist_reason", "leave_blacklisted_at", "avatar_path", "contract_file_path", "contract_file_name", "contract_uploaded_at", "work_shift_id") VALUES
	('e2e8b582-3960-4628-bd73-455e3ce6a107', 'U8d4a940b61b8aeacd6437ee652e96434', 'Waraporn Saekong', 'Inventory', 'Inventory', 25000.00, '2026-06-04', '2026-09-02', NULL, NULL, 'employee', 'active', '2026-06-12 05:12:50.221561+00', '2026-06-12 13:49:09.01166+00', NULL, '095-719-4351', 'Warapornsaekong@gmail.com', 'contract', NULL, 'passed', NULL, NULL, '9553c7d5-9245-4b81-a108-c1ed6c732240', NULL, 'CHV002', 'bank', 'SIAM COMMERCIAL BANK', 'วราภรณ์ แซ่ก๋ง', '553-400257-4', '0553 สาขานครศรีธรรมราช', false, NULL, NULL, NULL, NULL, NULL, NULL, '0f46108a-ba89-407d-a3cc-a185ad7b7822'),
	('c16ef716-339d-4fd3-8fc6-16efe4c7ee9e', 'U390f8e89ff72bdcbcd28a8d831827cc9', 'Monthakan Meekeaw', 'HR Officer', 'HR Officer', 40000.00, '2026-05-19', '2026-06-11', NULL, NULL, 'hr', 'active', '2026-06-12 03:16:56.63606+00', '2026-06-13 12:08:12.049193+00', '1995-03-10', '0957546270', 'mina.583197@gmail.com', 'contract', NULL, 'passed', NULL, NULL, '9553c7d5-9245-4b81-a108-c1ed6c732240', NULL, 'CHV001', 'bank', 'SIAM COMMERCIAL BANK', 'นางสาวมณฑกานต์ มีแก้ว', '553-297252-9', '0553 สาขานครศรีธรรมราช', false, NULL, NULL, NULL, NULL, NULL, NULL, '0f46108a-ba89-407d-a3cc-a185ad7b7822'),
	('b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'U07b33302852e4917c6c680fd4dc7592e', 'Dev', 'Developers', 'IT', NULL, NULL, NULL, NULL, NULL, 'dev', 'active', '2026-06-11 09:35:45.623379+00', '2026-06-12 10:03:56.170337+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'f0753b48-5f9f-4ac0-8140-2a8d3b8a783a', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, 'b7d62088-6d9e-42b2-880a-3a84df0ac2af/1781258632850_dev-letter-initial-logo-design-vector-illustration-236623773.jpg', NULL, NULL, NULL, NULL);


--
-- Data for Name: hr_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_announcements" ("id", "title", "body", "target_type", "target_value", "status", "sent_at", "created_by", "created_at", "scheduled_at", "image_path") VALUES
	('4cf153ca-53be-4b5a-a9ec-512f5cc74347', 'ขั้นตอนการ Register', 'ขั้นตอนการ Register 
ลิงก์ ลงทะเบียนพนักงาน (Production):
https://hr-app-two-iota.vercel.app/register

วิธีใช้ (พนักงานใหม่):
เปิด https://hr-app-two-iota.vercel.app/login
กด เข้าสู่ระบบด้วย LINE
ถ้ายังไม่มีในระบบ ระบบจะพาไป /register อัตโนมัติ
กรอกข้อมูล → รอ HR อนุมัติที่ /admin/employees', 'all', NULL, 'sent', '2026-06-12 09:14:41.159+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 09:14:41.286499+00', NULL, NULL),
	('e38b9be3-0900-4e5c-b50e-9e3d0b290bbd', '📌 ขั้นตอนการ Register', '1️⃣ เปิด https://hr-app-two-iota.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', 'all', NULL, 'sent', '2026-06-12 09:24:03.779+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 09:24:03.930644+00', NULL, 'e38b9be3-0900-4e5c-b50e-9e3d0b290bbd/1781256244095_test_______.png'),
	('1df81be1-c484-4e46-9802-37c795d7dd43', '📌 ขั้นตอนการ Register', '1️⃣ เปิด https://hr-app-two-iota.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', 'all', NULL, 'sent', '2026-06-12 09:25:38.564+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 09:25:38.717774+00', NULL, '1df81be1-c484-4e46-9802-37c795d7dd43/1781256338876_register_guide_under_5mb.jpg'),
	('95b2d8a6-b9b8-49a2-8954-5a5e48afb940', '📌 ขั้นตอนการ Register', '1️⃣ เปิด https://hr-app-two-iota.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅

#สอบถามเพิ่มเติมติดต่อ ฝ่าย HR', 'all', NULL, 'sent', '2026-06-12 09:25:46.861+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 09:25:46.996051+00', NULL, '95b2d8a6-b9b8-49a2-8954-5a5e48afb940/1781256347142_register_guide_under_5mb.jpg'),
	('c6cbb89f-a846-4902-95a8-3674696f9ab1', '📌 ขั้นตอนการ Register', '1️⃣ เปิด https://hr-app-two-iota.vercel.app/login
2️⃣ กด เข้าสู่ระบบด้วย LINE
3️⃣ กรอกข้อมูล → รอ HR อนุมัติ ✅', 'all', NULL, 'sent', '2026-06-12 09:32:22.699+00', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 09:32:22.863478+00', NULL, 'c6cbb89f-a846-4902-95a8-3674696f9ab1/1781256743019_register_guide_1024x1024.jpg');


--
-- Data for Name: hr_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_attendance" ("id", "employee_id", "check_in_at", "check_out_at", "check_in_location", "is_late", "work_hours", "created_at", "work_shift_id", "shift_date") VALUES
	('0bd80a9c-f2f4-4cb3-a9c4-be6959b9a0bc', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 01:22:09.647+00', NULL, '{"address": "10 11 หมู่ 10 เลียบวารี 79 แขวงโคกแฝด เขตหนองจอก กรุงเทพมหานคร 10530 ประเทศไทย", "latitude": 13.826052, "longitude": 100.806947}', false, NULL, '2026-06-12 01:22:12.066646+00', NULL, NULL),
	('f2518573-0f5e-4b2a-a212-056141bc1556', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-13 10:30:29.334+00', NULL, '{"address": "RRG4+7J3 แขวงโคกแฝด เขตหนองจอก กรุงเทพมหานคร 10530 ประเทศไทย", "latitude": 13.8259, "longitude": 100.806888}', true, NULL, '2026-06-13 10:30:31.337596+00', NULL, NULL),
	('0ee89f6f-664c-49e4-b826-7a664c1307ec', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-14 11:15:44.196+00', '2026-06-14 11:17:52.346+00', '{"address": "RRG4+7J3 แขวงโคกแฝด เขตหนองจอก กรุงเทพมหานคร 10530 ประเทศไทย", "latitude": 13.82588, "longitude": 100.806833}', true, 0.03, '2026-06-14 11:15:46.700386+00', NULL, NULL);


--
-- Data for Name: hr_attendance_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_branches" ("id", "name", "code", "manager_employee_id", "created_at", "updated_at", "address") VALUES
	('ac3f88c7-c114-4a45-9fac-8a50e3fc7003', 'Officer', '001', NULL, '2026-06-12 05:24:58.541422+00', '2026-06-12 05:24:58.541422+00', NULL),
	('5fbf0ebb-6f2d-4d84-a06f-9e70244aaf5f', 'Bang Na', '002', NULL, '2026-06-12 05:25:14.462338+00', '2026-06-12 05:25:14.462338+00', NULL),
	('8b875263-ae46-480f-8ebb-2723737811f2', 'Huai Khwang', '003', NULL, '2026-06-12 05:25:34.869209+00', '2026-06-12 05:25:34.869209+00', NULL),
	('c9dea1d6-0d98-4ea4-86ed-f1f99edd6cdc', 'Thonglor', '004', NULL, '2026-06-12 05:26:00.918098+00', '2026-06-12 05:26:00.918098+00', NULL),
	('9553c7d5-9245-4b81-a108-c1ed6c732240', 'Head Office', '000', 'c16ef716-339d-4fd3-8fc6-16efe4c7ee9e', '2026-06-11 15:54:56.599534+00', '2026-06-12 09:21:55.034793+00', NULL);


--
-- Data for Name: hr_complaints; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_complaints" ("id", "employee_id", "ticket_code", "subject", "body", "is_anonymous", "status", "created_at", "updated_at") VALUES
	('74d38ed9-d3cf-4c65-9e45-85380f0b533c', NULL, 'HR-9UZ3PN', 'ทำงานเยอะเกินไป', 'หัวหน้าใช้งานหนักเกินไป', true, 'closed', '2026-06-11 14:26:16.427285+00', '2026-06-12 06:20:08.704776+00');


--
-- Data for Name: hr_complaint_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_complaint_replies" ("id", "complaint_id", "author_employee_id", "message", "created_at") VALUES
	('a7b283a2-5e8a-4a44-a63f-b1e21c487251', '74d38ed9-d3cf-4c65-9e45-85380f0b533c', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'Test', '2026-06-12 06:20:08.420557+00');


--
-- Data for Name: hr_compliance_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_departments" ("id", "name", "created_at", "branch_id") VALUES
	('51c95eef-e4d2-4bc4-8793-af7d94ae2757', 'QA', '2026-06-11 15:54:56.599534+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('f0753b48-5f9f-4ac0-8140-2a8d3b8a783a', 'Management', '2026-06-11 15:54:56.599534+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('8c34e77c-1b4a-4311-af3b-08ac517e64e4', 'IT', '2026-06-12 05:56:39.142295+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('928c7b0e-a59a-4eed-9da6-b4eb9254156d', 'HR Officer', '2026-06-12 07:00:03.528145+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('bd6a7087-cc85-428f-9208-00551be58b29', 'Inventory', '2026-06-12 07:00:03.528145+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('ab69f9e0-4cfd-4013-84e8-5961082200a6', 'Accounting', '2026-06-12 07:00:03.528145+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('489ff03e-1e57-4da5-9296-aa02d3b1f52e', 'Admin', '2026-06-12 07:00:03.528145+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('cef33974-7822-40a1-9cde-ffdb036c8dcb', 'Service staff', '2026-06-12 08:03:30.879678+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('55eab5f4-657e-4ee3-93f2-a05f2d27242f', 'Branch Manager', '2026-06-12 08:03:54.829898+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('2b7f1643-a14a-48a8-af23-834c36defff5', 'Executive Chef', '2026-06-12 08:04:44.173317+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('9e288791-531c-4e1f-938f-4c3cf66b674c', 'Sous Chef', '2026-06-12 08:05:15.723464+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('a4629b44-2ba3-42f8-aadf-4800a2e1a514', 'Kitchen Staff', '2026-06-12 08:05:39.940329+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('231ae289-d08f-4416-b7d7-6fbc95f7e6ff', 'Reception', '2026-06-12 08:06:01.694895+00', '9553c7d5-9245-4b81-a108-c1ed6c732240'),
	('b0018ee2-9d90-4073-b896-b5a190191467', 'Cashier Staff', '2026-06-12 08:06:19.625008+00', '9553c7d5-9245-4b81-a108-c1ed6c732240');


--
-- Data for Name: hr_document_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_document_requests" ("id", "employee_id", "doc_type", "copies", "purpose", "status", "hr_note", "result_file_url", "created_at", "updated_at") VALUES
	('55014b3b-195b-427a-b166-98695ec88cc4', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'employment_cert', 1, 'เปลี่ยนงาน', 'rejected', 'Test', NULL, '2026-06-11 14:24:54.126239+00', '2026-06-12 06:19:54.431964+00'),
	('989d9efe-c812-4f19-a058-cfc8ee482b53', 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', 'employment_cert', 1, 'กู้บ้าน', 'pending', NULL, NULL, '2026-06-13 10:44:12.564785+00', '2026-06-13 10:44:12.564785+00');


--
-- Data for Name: hr_leave_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_leaves; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_overtime_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_payroll_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_payroll_hour_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hr_positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_positions" ("id", "name", "department_id", "branch_id", "created_at") VALUES
	('2450142a-cfbe-487c-b647-57c7e2fbf07e', 'Developers', '8c34e77c-1b4a-4311-af3b-08ac517e64e4', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 05:56:39.142295+00'),
	('e1cd7e3e-a4b5-4944-88fc-50971cf956b1', 'Manager', 'f0753b48-5f9f-4ac0-8140-2a8d3b8a783a', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00'),
	('da4911db-2286-4ced-ba8c-f851c77afd31', 'HR Officer', '928c7b0e-a59a-4eed-9da6-b4eb9254156d', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00'),
	('8c91f85e-9ccf-4057-bd20-b7e0d9aa44c1', 'Inventory', 'bd6a7087-cc85-428f-9208-00551be58b29', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00'),
	('8f32a93d-4cd0-46c8-9d20-344577bdac0e', 'Accounting', 'ab69f9e0-4cfd-4013-84e8-5961082200a6', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00'),
	('d85e3fd9-7f5c-4ab4-aa59-743fc5ee17b1', 'Admin', '489ff03e-1e57-4da5-9296-aa02d3b1f52e', '9553c7d5-9245-4b81-a108-c1ed6c732240', '2026-06-12 07:00:03.528145+00');


--
-- Data for Name: hr_runtime_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hr_runtime_config" ("key", "value", "updated_at") VALUES
	('hr_line_group_id', 'Ce45348a55eae08658be6f126749138d7', '2026-06-11 13:48:46.285573+00'),
	('work_start_hour', '9', '2026-06-11 15:50:56.530904+00');


--
-- Data for Name: inv_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_units" ("id", "name", "abbreviation", "created_at") VALUES
	('61adab81-0784-4e4c-8dca-181612cc1e68', 'ชิ้น', 'pcs', '2026-06-12 12:47:56.172951+00'),
	('7293c5f0-a862-44cb-9fc0-b08e8914f6f7', 'กิโลกรัม', 'kg', '2026-06-12 12:47:56.172951+00'),
	('37b510de-a40f-4066-a59e-06344ba7c0de', 'กรัม', 'g', '2026-06-12 12:47:56.172951+00'),
	('7516bf48-bed6-4201-8f3c-67ca9f2d8039', 'ลิตร', 'L', '2026-06-12 12:47:56.172951+00'),
	('f03a7189-d5c1-49af-9831-033589fe57f5', 'มิลลิลิตร', 'ml', '2026-06-12 12:47:56.172951+00'),
	('9a400c31-5327-4694-98e1-4b5178642929', 'แพ็ค', 'pack', '2026-06-12 12:47:56.172951+00'),
	('e4401658-b099-4a49-89dd-6f2252b333ad', 'ถุง', 'bag', '2026-06-12 12:47:56.172951+00'),
	('e9341546-3377-401f-9f5b-2708dcb42c88', 'กล่อง', 'box', '2026-06-12 12:47:56.172951+00');


--
-- Data for Name: inv_skus; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_skus" ("id", "code", "name", "category", "unit_id", "barcode", "min_stock", "max_stock", "image_url", "is_active", "created_at", "updated_at") VALUES
	('b15a7895-ae1d-48be-9410-4f77b81b6e96', 'SKU-DEMO-001', 'Demo น้ำจิ้ม', 'Sauce', '61adab81-0784-4e4c-8dca-181612cc1e68', '8850000000001', 10, 100, NULL, true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('6c0ad101-e031-45f0-b88a-38f6069c6ca4', 'SKU-DEMO-002', 'Demo หมูสับ', 'Meat', '61adab81-0784-4e4c-8dca-181612cc1e68', '8850000000002', 5, 50, NULL, true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('414af860-1823-491e-8e4c-4dd5a3a69463', 'SKU-DEMO-003', 'Demo ผักรวม', 'Vegetable', '61adab81-0784-4e4c-8dca-181612cc1e68', '8850000000003', 8, 80, NULL, true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('c3d0d542-dd4f-4060-808e-a8ef0ba6e846', 'SKU-DEMO-004', 'Demo กล่องใส่อาหาร', 'Packaging', '61adab81-0784-4e4c-8dca-181612cc1e68', '8850000000004', 20, 200, NULL, true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('b17e6c43-027a-45fe-b7bd-fd5fc2e7df6c', 'SKU-DEMO-005', 'Demo น้ำดื่ม', 'Beverage', '61adab81-0784-4e4c-8dca-181612cc1e68', '8850000000005', 15, 150, NULL, true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00');


--
-- Data for Name: inv_boms; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inv_branches; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_branches" ("id", "code", "name", "address", "is_active", "created_at", "updated_at") VALUES
	('48c8642c-6dd8-4fe9-a1b8-8927c24d3ccd', 'DEMO-HQ', 'Demo สาขาหลัก', 'Bangkok — UAT seed', true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00');


--
-- Data for Name: inv_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_suppliers" ("id", "code", "name", "address", "contact", "is_active", "created_at", "updated_at") VALUES
	('d4562a9a-5c17-4949-b333-189308ec9ee8', 'SUP-DEMO', 'Demo Supplier Co.', NULL, 'demo@supplier.local', true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00');


--
-- Data for Name: inv_warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_warehouses" ("id", "code", "name", "branch_id", "type", "is_active", "created_at", "updated_at") VALUES
	('8f7d93d0-68dc-458d-806d-604073e74266', 'WH-DEMO', 'Demo Main Warehouse', '48c8642c-6dd8-4fe9-a1b8-8927c24d3ccd', 'main', true, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00');


--
-- Data for Name: inv_inbound_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_inbound_orders" ("id", "supplier_id", "warehouse_id", "status", "received_date", "notes", "created_by", "created_at", "updated_at") VALUES
	('d12bbae3-83ed-474a-8029-3218ce3ca16e', 'd4562a9a-5c17-4949-b333-189308ec9ee8', '8f7d93d0-68dc-458d-806d-604073e74266', 'pending', NULL, NULL, 'b7d62088-6d9e-42b2-880a-3a84df0ac2af', '2026-06-12 15:38:29.426209+00', '2026-06-12 15:38:29.426209+00');


--
-- Data for Name: inv_inbound_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_inbound_items" ("id", "inbound_order_id", "sku_id", "quantity", "cost_per_unit", "lot_number", "expiry_date", "created_at") VALUES
	('2e3c01f3-bca3-4a70-8019-a5310230a584', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', 'b15a7895-ae1d-48be-9410-4f77b81b6e96', 1, NULL, NULL, NULL, '2026-06-12 16:13:35.628821+00'),
	('79686f88-ee2c-4365-bfd4-6a9fa2ece796', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', '6c0ad101-e031-45f0-b88a-38f6069c6ca4', 1, NULL, NULL, NULL, '2026-06-12 16:13:48.721195+00'),
	('8485c45e-130b-4ef0-9ae1-4c24b796a5d5', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', '414af860-1823-491e-8e4c-4dd5a3a69463', 1, NULL, NULL, NULL, '2026-06-12 16:14:01.350882+00'),
	('d40f8b39-f527-4801-8547-44dd32127f64', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', 'c3d0d542-dd4f-4060-808e-a8ef0ba6e846', 1, NULL, NULL, NULL, '2026-06-12 16:14:30.500848+00'),
	('1b9f437e-96e7-4c39-a632-0f4da21ed646', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', 'b17e6c43-027a-45fe-b7bd-fd5fc2e7df6c', 5, NULL, NULL, '2026-06-30', '2026-06-12 17:06:33.869361+00'),
	('2a3eae89-b027-4575-bf1f-eb321a3e1b1c', 'd12bbae3-83ed-474a-8029-3218ce3ca16e', 'b15a7895-ae1d-48be-9410-4f77b81b6e96', 1, NULL, NULL, NULL, '2026-06-12 17:06:56.072256+00');


--
-- Data for Name: inv_stock_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."inv_stock_balances" ("id", "sku_id", "warehouse_id", "quantity", "created_at", "updated_at") VALUES
	('dd9ff2c4-cc2f-48c3-834c-08feed00d0c5', 'b15a7895-ae1d-48be-9410-4f77b81b6e96', '8f7d93d0-68dc-458d-806d-604073e74266', 3, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('bb82d747-d4f9-4806-84a5-5ef2846144b8', '6c0ad101-e031-45f0-b88a-38f6069c6ca4', '8f7d93d0-68dc-458d-806d-604073e74266', 2, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('ed071c6d-c478-4692-88e4-4d33fdca9248', '414af860-1823-491e-8e4c-4dd5a3a69463', '8f7d93d0-68dc-458d-806d-604073e74266', 12, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('ccc4ee72-d4bd-4590-b70f-616c93021d36', 'c3d0d542-dd4f-4060-808e-a8ef0ba6e846', '8f7d93d0-68dc-458d-806d-604073e74266', 0, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00'),
	('50ff2202-00cb-4a1b-a71c-241e22e41252', 'b17e6c43-027a-45fe-b7bd-fd5fc2e7df6c', '8f7d93d0-68dc-458d-806d-604073e74266', 25, '2026-06-12 14:31:19.08953+00', '2026-06-12 14:31:19.08953+00');


--
-- Data for Name: inv_unit_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict yPusyhuogHglOv0Z7rx8JVwUx8MbMA4cOr9dgNA1acGfYFM9OXd6zskqcDcInYA

RESET ALL;
