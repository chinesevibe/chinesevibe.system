create or replace function public.inv_can_manage_master_data()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.hr_is_hr_admin()
    or exists (
      select 1
      from public.hr_employees e
      where e.id = public.hr_employee_id()
        and e.status = 'active'
        and (
          e.role = 'inventory'
          or (
            lower(trim(coalesce(e.department, ''))) = 'inventory'
            and lower(trim(coalesce(e.position, ''))) = 'inventory manager'
          )
        )
    )
$$;

revoke execute on function public.inv_can_manage_master_data() from public, anon;
grant execute on function public.inv_can_manage_master_data() to authenticated, service_role;

alter policy inv_units_write on public.inv_units
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_unit_conversions_write on public.inv_unit_conversions
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_skus_write on public.inv_skus
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_suppliers_write on public.inv_suppliers
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_branches_write on public.inv_branches
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_warehouses_write on public.inv_warehouses
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_boms_write on public.inv_boms
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_stock_balances_write on public.inv_stock_balances
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_inbound_orders_write on public.inv_inbound_orders
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());

alter policy inv_inbound_items_write on public.inv_inbound_items
  using (public.inv_can_manage_master_data())
  with check (public.inv_can_manage_master_data());
