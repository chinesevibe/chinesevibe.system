create table if not exists public.hr_attendance_adjustments (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.hr_attendance (id) on delete set null,
  leave_id uuid references public.hr_leaves (id) on delete set null,
  actor_employee_id uuid references public.hr_employees (id) on delete set null,
  action text not null,
  source text not null,
  reason text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hr_attendance_adjustments_attendance_idx
  on public.hr_attendance_adjustments (attendance_id, created_at desc);

create index if not exists hr_attendance_adjustments_leave_idx
  on public.hr_attendance_adjustments (leave_id, created_at desc);

create index if not exists hr_attendance_adjustments_actor_idx
  on public.hr_attendance_adjustments (actor_employee_id, created_at desc);

alter table public.hr_attendance_adjustments enable row level security;

drop policy if exists hr_attendance_adjustments_select on public.hr_attendance_adjustments;
create policy hr_attendance_adjustments_select on public.hr_attendance_adjustments
  for select using (public.hr_is_hr_admin() or public.hr_is_branch_manager());

alter table public.hr_leaves
  add column if not exists attendance_auto_checkout_id uuid references public.hr_attendance (id) on delete set null,
  add column if not exists attendance_auto_checkout_at timestamptz,
  add column if not exists attendance_auto_checkout_note text;
