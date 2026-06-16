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
  from public.inv_stock_balances b
  join public.inv_skus s on s.id = b.sku_id
  where b.warehouse_id = p_warehouse_id
    and s.is_active = true;

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
    and s.is_active = true
  order by s.code asc, s.name asc;

  return v_count_id;
end;
$$;

revoke all on function public.inv_create_stock_count(uuid, uuid, text, timestamptz, text) from public;
grant execute on function public.inv_create_stock_count(uuid, uuid, text, timestamptz, text) to authenticated;

create or replace function public.inv_start_stock_count(
  p_count_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inv_stock_counts%rowtype;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  select * into v_count
  from public.inv_stock_counts
  where id = p_count_id
  for update;

  if not found then
    raise exception 'stock count not found';
  end if;

  if v_count.status <> 'draft' then
    raise exception 'stock count must be draft to start';
  end if;

  update public.inv_stock_counts
  set status = 'counting',
      started_at = now(),
      updated_at = now()
  where id = p_count_id;
end;
$$;

revoke all on function public.inv_start_stock_count(uuid) from public;
grant execute on function public.inv_start_stock_count(uuid) to authenticated;

create or replace function public.inv_save_stock_count_items(
  p_count_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_count public.inv_stock_counts%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_physical_qty numeric;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'stock count items required';
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
    raise exception 'stock count must be counting to save';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'id')::uuid;
    v_physical_qty := (v_item ->> 'physical_qty')::numeric;

    if v_physical_qty < 0 then
      raise exception 'physical quantity must be non-negative';
    end if;

    update public.inv_stock_count_items
    set physical_qty = v_physical_qty,
        counted_by = v_actor_id,
        counted_at = now(),
        updated_at = now()
    where id = v_item_id
      and count_id = p_count_id;

    if not found then
      raise exception 'stock count item not found';
    end if;
  end loop;
end;
$$;

revoke all on function public.inv_save_stock_count_items(uuid, jsonb) from public;
grant execute on function public.inv_save_stock_count_items(uuid, jsonb) to authenticated;

create or replace function public.inv_finalize_stock_count(
  p_count_id uuid
)
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

      insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
      values (v_item.sku_id, v_count.warehouse_id, v_qty_delta)
      on conflict (sku_id, warehouse_id) do update
        set quantity = public.inv_stock_balances.quantity + excluded.quantity,
            updated_at = now();

      insert into public.inv_stock_movements (
        sku_id,
        warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        lot_number,
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
        v_item.lot_number,
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

revoke all on function public.inv_finalize_stock_count(uuid) from public;
grant execute on function public.inv_finalize_stock_count(uuid) to authenticated;

create or replace function public.inv_cancel_stock_count(
  p_count_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.inv_stock_counts%rowtype;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  select * into v_count
  from public.inv_stock_counts
  where id = p_count_id
  for update;

  if not found then
    raise exception 'stock count not found';
  end if;

  if v_count.status not in ('draft', 'counting') then
    raise exception 'stock count cannot be cancelled';
  end if;

  update public.inv_stock_counts
  set status = 'cancelled',
      updated_at = now()
  where id = p_count_id;
end;
$$;

revoke all on function public.inv_cancel_stock_count(uuid) from public;
grant execute on function public.inv_cancel_stock_count(uuid) to authenticated;
