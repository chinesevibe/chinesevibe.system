create table if not exists public.hr_line_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type text not null,
  source_type text,
  source_user_id text,
  source_group_id text,
  source_room_id text,
  line_user_id text,
  employee_id uuid references public.hr_employees (id) on delete set null,
  employee_code text,
  employee_name text,
  message_type text,
  message_text text,
  location_payload jsonb,
  event_payload jsonb not null
);

create index if not exists hr_line_webhook_events_received_at_idx
  on public.hr_line_webhook_events (received_at desc);

create index if not exists hr_line_webhook_events_employee_id_idx
  on public.hr_line_webhook_events (employee_id, received_at desc);

create index if not exists hr_line_webhook_events_line_user_id_idx
  on public.hr_line_webhook_events (line_user_id, received_at desc);

create index if not exists hr_line_webhook_events_event_type_idx
  on public.hr_line_webhook_events (event_type, received_at desc);

alter table public.hr_line_webhook_events enable row level security;

drop policy if exists hr_line_webhook_events_select on public.hr_line_webhook_events;
create policy hr_line_webhook_events_select on public.hr_line_webhook_events
  for select
  using (hr_is_hr_admin() or hr_is_ceo() or hr_is_dev());

grant all on table public.hr_line_webhook_events to authenticated;
grant all on table public.hr_line_webhook_events to service_role;

comment on table public.hr_line_webhook_events is
  'Incoming LINE webhook events and chat snapshots for HR audit history.';
