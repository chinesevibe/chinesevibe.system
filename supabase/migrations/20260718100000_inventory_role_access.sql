-- Inventory portal roles: inventory (ops write), hr + dev (admin), ceo (read-only), dev (full)

-- Operational write: warehouse staff + HR + dev
create or replace function public.inv_can_manage_requisitions()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'inventory', 'dev')
  )
$$;

revoke execute on function public.inv_can_manage_requisitions() from public, anon;
grant execute on function public.inv_can_manage_requisitions() to authenticated, service_role;

-- CEO read-only access to operational inventory tables
create or replace function public.inv_can_view_inventory_ops()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.inv_can_manage_requisitions() or public.hr_is_ceo()
$$;

revoke execute on function public.inv_can_view_inventory_ops() from public, anon;
grant execute on function public.inv_can_view_inventory_ops() to authenticated, service_role;

-- Re-assert HR admin without legacy admin role
create or replace function public.hr_is_hr_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.line_user_id = hr_line_user_id()
      and e.status = 'active'
      and (
        e.role in ('hr', 'dev')
        or trim(e.department) = 'HR Officer'
        or (
          trim(e.department) = 'Officer'
          and trim(e.position) = 'HR Officer'
        )
      )
  )
$$;

create or replace function public.inv_can_override_fefo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'inventory', 'dev')
  )
$$;

do $$
begin
  if to_regprocedure('public.inv_can_manage_damage()') is not null then
    execute $fn$
      create or replace function public.inv_can_manage_damage()
      returns boolean
      language sql stable security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('hr', 'inventory', 'dev')
        )
      $body$
    $fn$;
  end if;
end $$;

-- Inbound approve: allow inventory ops (keep existing FEFO receive logic)
create or replace function public.inv_approve_inbound_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.inv_inbound_orders%rowtype;
  v_item public.inv_inbound_items%rowtype;
  v_sku public.inv_skus%rowtype;
  v_lot_number text;
  v_lot_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_received_date date;
begin
  if not (public.hr_is_hr_admin() or public.inv_can_manage_requisitions()) then
    raise exception 'forbidden';
  end if;

  select * into v_order
  from public.inv_inbound_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'inbound order not found';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order must be pending to approve';
  end if;

  if v_order.warehouse_id is null then
    raise exception 'warehouse required';
  end if;

  v_received_date := coalesce(v_order.received_date::date, current_date);

  for v_item in
    select * from public.inv_inbound_items
    where inbound_order_id = p_order_id
  loop
    if v_item.sku_id is null or v_item.quantity <= 0 then
      continue;
    end if;

    select * into v_sku from public.inv_skus where id = v_item.sku_id;

    if v_sku.expiry_required and v_item.expiry_date is null then
      raise exception 'expiry date required for sku %', v_sku.code;
    end if;

    v_lot_number := nullif(trim(coalesce(v_item.lot_number, '')), '');
    if v_lot_number is null and v_sku.lot_tracking_required then
      v_lot_number := 'LOT-' || to_char(now(), 'YYYYMMDD') || '-' || left(v_item.id::text, 8);
    elsif v_lot_number is null then
      v_lot_number := 'NOLOT-' || left(v_item.id::text, 8);
    end if;

    insert into public.inv_stock_lots (
      sku_id,
      warehouse_id,
      lot_number,
      expiry_date,
      received_date,
      received_qty,
      remaining_qty,
      unit_cost,
      status,
      inbound_item_id
    )
    values (
      v_item.sku_id,
      v_order.warehouse_id,
      v_lot_number,
      v_item.expiry_date,
      v_received_date,
      v_item.quantity,
      v_item.quantity,
      v_item.cost_per_unit,
      case
        when v_item.expiry_date is not null and v_item.expiry_date < current_date then 'expired'
        else 'available'
      end,
      v_item.id
    )
    returning id into v_lot_id;

    select quantity into v_balance_before
    from public.inv_stock_balances
    where sku_id = v_item.sku_id
      and warehouse_id = v_order.warehouse_id
    for update;

    insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
    values (v_item.sku_id, v_order.warehouse_id, v_item.quantity)
    on conflict (sku_id, warehouse_id) do update
      set quantity = public.inv_stock_balances.quantity + excluded.quantity,
          updated_at = now();

    v_balance_after := coalesce(v_balance_before, 0) + v_item.quantity;

    insert into public.inv_stock_movements (
      sku_id,
      warehouse_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      lot_id,
      lot_number,
      qty_before,
      qty_after,
      created_by,
      notes
    )
    values (
      v_item.sku_id,
      v_order.warehouse_id,
      'receive',
      v_item.quantity,
      'inbound',
      p_order_id,
      v_lot_id,
      v_lot_number,
      v_balance_before,
      v_balance_after,
      public.hr_employee_id(),
      'Inbound receive'
    );
  end loop;

  update public.inv_inbound_orders
  set
    status = 'approved',
    received_date = coalesce(received_date, now()),
    updated_at = now()
  where id = p_order_id;
end;
$$;

-- Master + inbound write for inventory ops
drop policy if exists inv_inbound_orders_write on public.inv_inbound_orders;
create policy inv_inbound_orders_write on public.inv_inbound_orders
  for all using (public.hr_is_hr_admin() or public.inv_can_manage_requisitions())
  with check (public.hr_is_hr_admin() or public.inv_can_manage_requisitions());

drop policy if exists inv_inbound_items_write on public.inv_inbound_items;
create policy inv_inbound_items_write on public.inv_inbound_items
  for all using (public.hr_is_hr_admin() or public.inv_can_manage_requisitions())
  with check (public.hr_is_hr_admin() or public.inv_can_manage_requisitions());

drop policy if exists inv_stock_balances_write on public.inv_stock_balances;
create policy inv_stock_balances_write on public.inv_stock_balances
  for all using (public.hr_is_hr_admin() or public.inv_can_manage_requisitions())
  with check (public.hr_is_hr_admin() or public.inv_can_manage_requisitions());

-- Requisitions: CEO read-only
drop policy if exists inv_requisitions_select on public.inv_requisitions;
create policy inv_requisitions_select on public.inv_requisitions
  for select using (
    requester_id = public.hr_employee_id()
    or public.inv_can_view_inventory_ops()
  );

drop policy if exists inv_requisition_items_select on public.inv_requisition_items;
create policy inv_requisition_items_select on public.inv_requisition_items
  for select using (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_view_inventory_ops()
        )
    )
  );

-- Transfer / stock count / adjustments: CEO read-only
drop policy if exists inv_stock_counts_select on public.inv_stock_counts;
create policy inv_stock_counts_select on public.inv_stock_counts
  for select using (public.inv_can_view_inventory_ops());

drop policy if exists inv_stock_count_items_select on public.inv_stock_count_items;
create policy inv_stock_count_items_select on public.inv_stock_count_items
  for select using (
    exists (
      select 1
      from public.inv_stock_counts c
      where c.id = count_id
        and public.inv_can_view_inventory_ops()
    )
  );

drop policy if exists inv_stock_adjustments_select on public.inv_stock_adjustments;
create policy inv_stock_adjustments_select on public.inv_stock_adjustments
  for select using (public.inv_can_view_inventory_ops());

drop policy if exists inv_transfers_select on public.inv_transfers;
create policy inv_transfers_select on public.inv_transfers
  for select using (public.inv_can_view_inventory_ops());

drop policy if exists inv_transfer_items_select on public.inv_transfer_items;
create policy inv_transfer_items_select on public.inv_transfer_items
  for select using (
    exists (
      select 1
      from public.inv_transfers t
      where t.id = transfer_id
        and public.inv_can_view_inventory_ops()
    )
  );

-- FEFO lots: CEO read via ops viewer
drop policy if exists inv_stock_lots_select on public.inv_stock_lots;
create policy inv_stock_lots_select on public.inv_stock_lots
  for select using (
    public.inv_can_view_inventory_ops()
    or public.inv_is_active_employee()
  );

drop policy if exists inv_requisition_issue_lines_select on public.inv_requisition_issue_lines;
create policy inv_requisition_issue_lines_select on public.inv_requisition_issue_lines
  for select using (
    public.inv_can_view_inventory_ops()
    or public.inv_is_active_employee()
  );
