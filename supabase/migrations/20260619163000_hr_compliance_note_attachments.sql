-- Renewal evidence attachments for employee compliance notes

alter table public.hr_compliance_notes
  add column if not exists attachment_file_path text,
  add column if not exists attachment_file_name text,
  add column if not exists attachment_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-compliance-notes',
  'hr-compliance-notes',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy hr_compliance_notes_storage_select on storage.objects
  for select using (
    bucket_id = 'hr-compliance-notes'
    and (hr_is_hr_admin() or hr_is_ceo())
  );

create policy hr_compliance_notes_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-compliance-notes'
    and hr_is_hr_admin()
  );

create policy hr_compliance_notes_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-compliance-notes'
    and hr_is_hr_admin()
  );

create policy hr_compliance_notes_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-compliance-notes'
    and hr_is_hr_admin()
  );
