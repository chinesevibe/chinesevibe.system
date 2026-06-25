drop index if exists public.hr_attendance_open_record_lookup_idx;

create index if not exists hr_attendance_open_record_lookup_idx
  on public.hr_attendance (employee_id, check_in_at desc)
  where check_out_at is null
    and not ('missing_checkout' = any(coalesce(location_review_flags, '{}'::text[])));

create or replace function public.hr_attendance_prevent_multiple_open_records()
returns trigger
language plpgsql
as $$
begin
  if new.check_out_at is null
    and not ('missing_checkout' = any(coalesce(new.location_review_flags, '{}'::text[])))
    and exists (
      select 1
      from public.hr_attendance existing
      where existing.employee_id = new.employee_id
        and existing.check_out_at is null
        and not ('missing_checkout' = any(coalesce(existing.location_review_flags, '{}'::text[])))
        and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) then
    raise exception 'employee already has an open attendance record';
  end if;

  return new;
end;
$$;
