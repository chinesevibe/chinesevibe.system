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
