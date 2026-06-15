-- Document requests: hold + reject statuses for HR actions

alter table public.hr_document_requests
  drop constraint if exists hr_document_requests_status_check;

alter table public.hr_document_requests
  add constraint hr_document_requests_status_check
  check (
    status in (
      'pending',
      'on_hold',
      'processing',
      'ready',
      'completed',
      'rejected'
    )
  );
