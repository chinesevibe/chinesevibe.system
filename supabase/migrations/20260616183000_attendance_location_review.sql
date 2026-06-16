alter table public.hr_attendance
  add column if not exists check_out_location jsonb,
  add column if not exists location_review_status text not null default 'clear'
    check (location_review_status in ('clear', 'pending_hr', 'approved', 'rejected')),
  add column if not exists location_review_flags text[] not null default '{}',
  add column if not exists location_review_note text,
  add column if not exists location_reviewed_by uuid references public.hr_employees (id) on delete set null,
  add column if not exists location_reviewed_at timestamptz;

create index if not exists hr_attendance_location_review_status_idx
  on public.hr_attendance (location_review_status, check_in_at desc);

comment on column public.hr_attendance.check_in_location is
  'Raw check-in location payload including lat/lng and optional anti-spoof metadata';
comment on column public.hr_attendance.check_out_location is
  'Raw check-out location payload including lat/lng and optional anti-spoof metadata';
comment on column public.hr_attendance.location_review_status is
  'Location trust state: clear, pending_hr, approved, rejected';
comment on column public.hr_attendance.location_review_flags is
  'Suspicious location flags collected during check-in/out review';
