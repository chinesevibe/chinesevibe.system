-- Allow CEO to update employee records (matches app canEditEmployeeRecord)

drop policy if exists "employees update hr only" on public.hr_employees;

create policy "employees update hr or ceo" on public.hr_employees
  for update to authenticated
  using (public.hr_is_hr_admin() or public.hr_is_ceo())
  with check (public.hr_is_hr_admin() or public.hr_is_ceo());

-- Dev role is included in hr_is_hr_admin()
