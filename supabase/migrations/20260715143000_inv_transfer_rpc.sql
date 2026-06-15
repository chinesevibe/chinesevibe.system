create or replace function public.inv_send_transfer(
  p_transfer_id uuid,
  p_shipper text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_transfer public.inv_transfers%rowtype;
  v_item public.inv_transfer_items%rowtype;
  v_stock_qty numeric;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  select * into v_transfer
  from public.inv_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer not found';
  end if;

  if v_transfer.status <> 'draft' then
    raise exception 'transfer must be draft to send';
  end if;

  for v_item in
    select *
    from public.inv_transfer_items
    where transfer_id = p_transfer_id
    for update
  loop
    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_item.sku_id
      and warehouse_id = v_transfer.from_warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_item.qty_sent then
      raise exception 'insufficient stock';
    end if;

    update public.inv_stock_balances
    set quantity = quantity - v_item.qty_sent,
        updated_at = now()
    where sku_id = v_item.sku_id
      and warehouse_id = v_transfer.from_warehouse_id;

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
      v_transfer.from_warehouse_id,
      'transfer_out',
      -v_item.qty_sent,
      'transfer',
      p_transfer_id,
      v_item.lot_number,
      v_actor_id,
      'Branch transfer sent'
    );
  end loop;

  update public.inv_transfers
  set status = 'in_transit',
      shipper = nullif(trim(coalesce(p_shipper, shipper, '')), ''),
      sent_by = v_actor_id,
      sent_at = now(),
      updated_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.inv_send_transfer(uuid, text) from public;
grant execute on function public.inv_send_transfer(uuid, text) to authenticated;

create or replace function public.inv_receive_transfer(
  p_transfer_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_transfer public.inv_transfers%rowtype;
  v_row public.inv_transfer_items%rowtype;
  v_item jsonb;
  v_qty_received numeric;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'received items required';
  end if;

  select * into v_transfer
  from public.inv_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer not found';
  end if;

  if v_transfer.status <> 'in_transit' then
    raise exception 'transfer must be in transit to receive';
  end if;

  for v_row in
    select *
    from public.inv_transfer_items
    where transfer_id = p_transfer_id
    for update
  loop
    select item into v_item
    from jsonb_array_elements(p_items) item
    where (item ->> 'id')::uuid = v_row.id
    limit 1;

    if v_item is null then
      raise exception 'missing received quantity for item %', v_row.id;
    end if;

    v_qty_received := (v_item ->> 'qty_received')::numeric;

    if v_qty_received < 0 or v_qty_received > v_row.qty_sent then
      raise exception 'received quantity exceeds sent quantity';
    end if;

    update public.inv_transfer_items
    set qty_received = v_qty_received,
        updated_at = now()
    where id = v_row.id;

    if v_qty_received > 0 then
      insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
      values (v_row.sku_id, v_transfer.to_warehouse_id, v_qty_received)
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
        v_row.sku_id,
        v_transfer.to_warehouse_id,
        'transfer_in',
        v_qty_received,
        'transfer',
        p_transfer_id,
        v_row.lot_number,
        v_actor_id,
        'Branch transfer received'
      );
    end if;
  end loop;

  update public.inv_transfers
  set status = 'received',
      received_by = v_actor_id,
      received_at = now(),
      updated_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.inv_receive_transfer(uuid, jsonb) from public;
grant execute on function public.inv_receive_transfer(uuid, jsonb) to authenticated;
