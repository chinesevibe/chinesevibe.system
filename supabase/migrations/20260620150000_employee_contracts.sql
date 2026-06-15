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
