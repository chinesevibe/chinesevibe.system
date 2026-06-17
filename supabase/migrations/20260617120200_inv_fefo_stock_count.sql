-- FEFO-011: Stock count at lot level

create or replace function public.inv_create_stock_count(
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_scope text default 'all',
  p_planned_at timestamptz default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_count_id uuid;
  v_snapshot_rows integer;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  if coalesce(p_scope, 'all') <> 'all' then
    raise exception 'unsupported scope';
  end if;

  perform public.inv_validate_branch_warehouse(p_branch_id, p_warehouse_id);

  select count(*) into v_snapshot_rows
  from public.inv_stock_lots l
  join public.inv_skus s on s.id = l.sku_id
  where l.warehouse_id = p_warehouse_id
    and l.remaining_qty > 0
    and l.status in ('available', 'reserved', 'expired')
    and s.is_active = true;

  if coalesce(v_snapshot_rows, 0) = 0 then
    select count(*) into v_snapshot_rows
    from public.inv_stock_balances b
    join public.inv_skus s on s.id = b.sku_id
    where b.warehouse_id = p_warehouse_id
      and b.quantity > 0
      and s.is_active = true;
  end if;

  if coalesce(v_snapshot_rows, 0) = 0 then
    raise exception 'no stock rows found for warehouse';
  end if;

  v_actor_id := public.hr_employee_id();

  insert into public.inv_stock_counts (
    branch_id,
    warehouse_id,
    scope,
    status,
    planned_at,
    created_by,
    notes
  )
  values (
    p_branch_id,
    p_warehouse_id,
    'all',
    'draft',
    p_planned_at,
    v_actor_id,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_count_id;

  insert into public.inv_stock_count_items (
    count_id,
    sku_id,
    system_qty,
    physical_qty,
    lot_id,
    lot_number
  )
  select
    v_count_id,
    l.sku_id,
    l.remaining_qty,
    null,
    l.id,
    l.lot_number
  from public.inv_stock_lots l
  join public.inv_skus s on s.id = l.sku_id
  where l.warehouse_id = p_warehouse_id
    and l.remaining_qty > 0
    and l.status in ('available', 'reserved', 'expired')
    and s.is_active = true
  order by s.code asc, l.expiry_date nulls last, l.lot_number asc;

  get diagnostics v_snapshot_rows = row_count;

  if coalesce(v_snapshot_rows, 0) = 0 then
    insert into public.inv_stock_count_items (
      count_id,
      sku_id,
      system_qty,
      physical_qty,
      lot_number
    )
    select
      v_count_id,
      b.sku_id,
      b.quantity,
      null,
      null
    from public.inv_stock_balances b
    join public.inv_skus s on s.id = b.sku_id
    where b.warehouse_id = p_warehouse_id
      and b.quantity > 0
      and s.is_active = true
    order by s.code asc, s.name asc;
  end if;

  return v_count_id;
end;
$$;

create or replace function public.inv_finalize_stock_count(p_count_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_count public.inv_stock_counts%rowtype;
  v_item public.inv_stock_count_items%rowtype;
  v_missing_count integer;
  v_qty_delta numeric;
  v_reason text;
  v_balance_before numeric;
  v_balance_after numeric;
  v_lot_before numeric;
  v_lot_after numeric;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  select * into v_count
  from public.inv_stock_counts
  where id = p_count_id
  for update;

  if not found then
    raise exception 'stock count not found';
  end if;

  if v_count.status <> 'counting' then
    raise exception 'stock count must be counting to finalize';
  end if;

  select count(*) into v_missing_count
  from public.inv_stock_count_items
  where count_id = p_count_id
    and physical_qty is null;

  if v_missing_count > 0 then
    raise exception 'physical quantity missing';
  end if;

  v_reason := coalesce(nullif(trim(v_count.notes), ''), 'Stock count variance');

  for v_item in
    select *
    from public.inv_stock_count_items
    where count_id = p_count_id
    order by created_at asc
    for update
  loop
    v_qty_delta := coalesce(v_item.physical_qty, 0) - v_item.system_qty;

    if v_qty_delta <> 0 then
      insert into public.inv_stock_adjustments (
        count_id,
        warehouse_id,
        sku_id,
        qty_delta,
        reason,
        status,
        created_by,
        applied_at
      )
      values (
        p_count_id,
        v_count.warehouse_id,
        v_item.sku_id,
        v_qty_delta,
        v_reason,
        'applied',
        v_actor_id,
        now()
      );

      if v_item.lot_id is not null then
        select remaining_qty into v_lot_before
        from public.inv_stock_lots
        where id = v_item.lot_id
        for update;

        v_lot_after := coalesce(v_lot_before, 0) + v_qty_delta;

        update public.inv_stock_lots
        set
          remaining_qty = greatest(v_lot_after, 0),
          status = case
            when v_lot_after <= 0 then 'depleted'
            else status
          end,
          updated_at = now()
        where id = v_item.lot_id;
      end if;

      select quantity into v_balance_before
      from public.inv_stock_balances
      where sku_id = v_item.sku_id
        and warehouse_id = v_count.warehouse_id
      for update;

      insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
      values (v_item.sku_id, v_count.warehouse_id, v_qty_delta)
      on conflict (sku_id, warehouse_id) do update
        set quantity = public.inv_stock_balances.quantity + excluded.quantity,
            updated_at = now();

      v_balance_after := coalesce(v_balance_before, 0) + v_qty_delta;

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
        v_count.warehouse_id,
        'stock_count_adjustment',
        v_qty_delta,
        'stock_count',
        p_count_id,
        v_item.lot_id,
        v_item.lot_number,
        v_balance_before,
        v_balance_after,
        v_actor_id,
        format(
          'System %s / Physical %s',
          v_item.system_qty,
          coalesce(v_item.physical_qty, 0)
        )
      );
    end if;
  end loop;

  update public.inv_stock_counts
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = p_count_id;
end;
$$;
