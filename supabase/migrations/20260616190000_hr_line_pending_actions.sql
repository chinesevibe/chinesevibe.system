-- HR LINE two-step reject / complaint reply state (service role only)
create table if not exists public.hr_line_pending_actions (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  approver_employee_id uuid not null references public.hr_employees (id) on delete cascade,
  action_kind text not null check (
    action_kind in (
      'reject_leave',
      'reject_ot',
      'reject_registration',
      'reject_document',
      'reject_attendance',
      'complaint_reply',
      'complaint_close'
    )
  ),
  target_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists hr_line_pending_actions_one_per_user_idx
  on public.hr_line_pending_actions (line_user_id);

create index if not exists hr_line_pending_actions_expires_at_idx
  on public.hr_line_pending_actions (expires_at);

alter table public.hr_line_pending_actions enable row level security;

comment on table public.hr_line_pending_actions is
  'LINE OA pending HR text input (reject reason / complaint reply). Service role only.';
