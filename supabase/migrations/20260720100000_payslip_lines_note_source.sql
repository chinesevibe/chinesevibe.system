-- F3: Add note and source columns to hr_payslip_lines
-- note: optional free-text annotation (HR remark)
-- source: 'system' (auto-generated) or 'manual' (HR-added)

alter table public.hr_payslip_lines
  add column if not exists note text,
  add column if not exists source text not null default 'system';

-- Backfill existing rows as system-generated
update public.hr_payslip_lines set source = 'system' where source is null or source = '';

-- Index for filtering manual lines efficiently
create index if not exists hr_payslip_lines_source_idx
  on public.hr_payslip_lines (payslip_id, source);
