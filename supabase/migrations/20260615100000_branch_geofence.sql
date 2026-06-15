alter table public.hr_branches
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7),
  add column if not exists geofence_radius_m int not null default 200
    check (geofence_radius_m > 0 and geofence_radius_m <= 200),
  add column if not exists geofence_enabled boolean not null default true;

comment on column public.hr_branches.latitude is 'ศูนย์ geofence — ละติจูด';
comment on column public.hr_branches.longitude is 'ศูนย์ geofence — ลองจิจูด';
comment on column public.hr_branches.geofence_radius_m is 'รัศมี geofence (สูงสุด 200m)';
