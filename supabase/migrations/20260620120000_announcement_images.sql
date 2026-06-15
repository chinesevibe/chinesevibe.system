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
