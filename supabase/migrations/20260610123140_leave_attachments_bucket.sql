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
