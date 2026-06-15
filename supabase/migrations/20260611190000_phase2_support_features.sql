-- Phase 2: F7 Document Request, F8 Complaint, F9 Announcements

-- F7: Document requests
create table if not exists public.hr_document_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  doc_type text not null check (doc_type in ('employment_cert', 'salary_cert', 'tax_cert', 'other')),
  copies smallint not null default 1 check (copies >= 1 and copies <= 10),
  purpose text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'completed')),
  hr_note text,
  result_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_document_requests_employee_id_idx on public.hr_document_requests (employee_id);
create index if not exists hr_document_requests_status_idx on public.hr_document_requests (status);

-- F8: Complaints
create table if not exists public.hr_complaints (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees (id) on delete set null,
  ticket_code text not null unique,
  subject text not null,
  body text not null,
  is_anonymous boolean not null default false,
  status text not null default 'open' check (status in ('open', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_complaints_status_idx on public.hr_complaints (status);
create index if not exists hr_complaints_ticket_code_idx on public.hr_complaints (ticket_code);

create table if not exists public.hr_complaint_replies (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.hr_complaints (id) on delete cascade,
  author_employee_id uuid not null references public.hr_employees (id) on delete restrict,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists hr_complaint_replies_complaint_id_idx on public.hr_complaint_replies (complaint_id);

-- F9: Announcements
create table if not exists public.hr_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_type text not null default 'all' check (target_type in ('all', 'department')),
  target_value text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_by uuid references public.hr_employees (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hr_announcements_status_idx on public.hr_announcements (status);

-- updated_at triggers
create or replace function public.hr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_document_requests_updated_at on public.hr_document_requests;
create trigger hr_document_requests_updated_at
  before update on public.hr_document_requests
  for each row execute function public.hr_set_updated_at();

drop trigger if exists hr_complaints_updated_at on public.hr_complaints;
create trigger hr_complaints_updated_at
  before update on public.hr_complaints
  for each row execute function public.hr_set_updated_at();

-- RLS
alter table public.hr_document_requests enable row level security;
alter table public.hr_complaints enable row level security;
alter table public.hr_complaint_replies enable row level security;
alter table public.hr_announcements enable row level security;

-- hr_document_requests
create policy hr_document_requests_select on public.hr_document_requests
  for select using (employee_id = hr_employee_id() or hr_is_hr_admin());

create policy hr_document_requests_insert on public.hr_document_requests
  for insert with check (employee_id = hr_employee_id());

create policy hr_document_requests_update on public.hr_document_requests
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_document_requests_delete on public.hr_document_requests
  for delete using (hr_is_hr_admin());

-- hr_complaints: employees see own non-anonymous; HR sees all
create policy hr_complaints_select on public.hr_complaints
  for select using (
    hr_is_hr_admin()
    or (not is_anonymous and employee_id = hr_employee_id())
  );

create policy hr_complaints_insert on public.hr_complaints
  for insert with check (
    hr_employee_id() is not null
    and (
      (not is_anonymous and employee_id = hr_employee_id())
      or (is_anonymous and employee_id is null)
    )
  );

create policy hr_complaints_update on public.hr_complaints
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

-- hr_complaint_replies
create policy hr_complaint_replies_select on public.hr_complaint_replies
  for select using (
    hr_is_hr_admin()
    or exists (
      select 1 from public.hr_complaints c
      where c.id = complaint_id
        and not c.is_anonymous
        and c.employee_id = hr_employee_id()
    )
  );

create policy hr_complaint_replies_insert on public.hr_complaint_replies
  for insert with check (hr_is_hr_admin() and author_employee_id = hr_employee_id());

-- hr_announcements: HR only
create policy hr_announcements_select on public.hr_announcements
  for select using (hr_is_hr_admin());

create policy hr_announcements_insert on public.hr_announcements
  for insert with check (hr_is_hr_admin());

create policy hr_announcements_update on public.hr_announcements
  for update using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy hr_announcements_delete on public.hr_announcements
  for delete using (hr_is_hr_admin());

-- Storage bucket for HR document results
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-documents',
  'hr-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy hr_documents_storage_select on storage.objects
  for select using (
    bucket_id = 'hr-documents'
    and (
      hr_is_hr_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy hr_documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );

create policy hr_documents_storage_update on storage.objects
  for update using (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );

create policy hr_documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'hr-documents'
    and hr_is_hr_admin()
  );
