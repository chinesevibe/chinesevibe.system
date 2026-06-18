create index if not exists hr_attendance_open_record_lookup_idx
  on public.hr_attendance (employee_id, check_in_at desc)
  where check_out_at is null;

create index if not exists hr_attendance_employee_shift_date_check_in_idx
  on public.hr_attendance (employee_id, shift_date desc, check_in_at desc);

create or replace function public.hr_attendance_prevent_multiple_open_records()
returns trigger
language plpgsql
as $$
begin
  if new.check_out_at is null and exists (
    select 1
    from public.hr_attendance existing
    where existing.employee_id = new.employee_id
      and existing.check_out_at is null
      and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'employee already has an open attendance record';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_hr_attendance_prevent_multiple_open_records on public.hr_attendance;

create trigger trg_hr_attendance_prevent_multiple_open_records
before insert or update of employee_id, check_out_at
on public.hr_attendance
for each row
execute function public.hr_attendance_prevent_multiple_open_records();
