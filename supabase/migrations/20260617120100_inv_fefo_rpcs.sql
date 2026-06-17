-- FEFO-007–FEFO-011: Wire stock-out flows to lot-level FEFO

-- ---------------------------------------------------------------------------
-- FEFO-007: Requisition issue with FEFO auto-allocation
-- ---------------------------------------------------------------------------

create or replace function public.inv_issue_requisition(
  p_requisition_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_requisition public.inv_requisitions%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_qty_issued numeric;
  v_lot_number text;
  v_req_item public.inv_requisition_items%rowtype;
  v_stock_qty numeric;
  v_sku public.inv_skus%rowtype;
  v_alloc jsonb;
  v_alloc_lot_id uuid;
  v_alloc_qty numeric;
  v_override_reason text;
  v_fefo record;
  v_first_lot text;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'issued items required';
  end if;

  select * into v_requisition
  from public.inv_requisitions
  where id = p_requisition_id
  for update;

  if not found then
    raise exception 'requisition not found';
  end if;

  if v_requisition.status <> 'approved' then
    raise exception 'requisition must be approved to issue';
  end if;

  for v_req_item in
    select *
    from public.inv_requisition_items
    where requisition_id = p_requisition_id
      and qty_approved > 0
    for update
  loop
    v_item := null;

    select item into v_item
    from jsonb_array_elements(p_items) item
    where (item ->> 'id')::uuid = v_req_item.id
    limit 1;

    if v_item is null then
      raise exception 'missing issued quantity for item %', v_req_item.id;
    end if;

    v_item_id := (v_item ->> 'id')::uuid;
    v_qty_issued := (v_item ->> 'qty_issued')::numeric;
    v_lot_number := nullif(trim(v_item ->> 'lot_number'), '');
    v_override_reason := nullif(trim(v_item ->> 'override_reason'), '');

    if v_item_id <> v_req_item.id then
      raise exception 'invalid issued item';
    end if;

    if v_qty_issued <= 0 or v_qty_issued > v_req_item.qty_approved then
      raise exception 'issued quantity exceeds approved quantity';
    end if;

    select * into v_sku from public.inv_skus where id = v_req_item.sku_id;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_req_item.sku_id
      and warehouse_id = v_requisition.warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_qty_issued then
      raise exception 'insufficient stock';
    end if;

    delete from public.inv_requisition_issue_lines
    where requisition_item_id = v_req_item.id;

    if v_item ? 'allocations' and jsonb_array_length(v_item -> 'allocations') > 0 then
      for v_alloc in select * from jsonb_array_elements(v_item -> 'allocations')
      loop
        v_alloc_lot_id := (v_alloc ->> 'lot_id')::uuid;
        v_alloc_qty := (v_alloc ->> 'qty')::numeric;
        v_override_reason := coalesce(
          nullif(trim(v_alloc ->> 'override_reason'), ''),
          v_override_reason
        );

        if v_override_reason is not null and not public.inv_can_override_fefo() then
          raise exception 'fefo override not permitted';
        end if;

        perform public.inv_apply_lot_deduction(
          v_req_item.sku_id,
          v_requisition.warehouse_id,
          v_alloc_lot_id,
          v_alloc_qty,
          'requisition_issue',
          'requisition',
          p_requisition_id,
          v_actor_id,
          'Kitchen requisition issue',
          v_override_reason
        );

        insert into public.inv_requisition_issue_lines (
          requisition_item_id,
          lot_id,
          qty_issued,
          override_reason,
          overridden_by
        )
        values (
          v_req_item.id,
          v_alloc_lot_id,
          v_alloc_qty,
          v_override_reason,
          case when v_override_reason is not null then v_actor_id else null end
        );
      end loop;
    elsif v_sku.default_issue_method = 'manual' then
      if v_lot_number is null then
        raise exception 'lot number required';
      end if;

      select l.id into v_alloc_lot_id
      from public.inv_stock_lots l
      where l.sku_id = v_req_item.sku_id
        and l.warehouse_id = v_requisition.warehouse_id
        and l.lot_number = v_lot_number
        and l.remaining_qty > 0
      for update;

      if v_alloc_lot_id is null then
        raise exception 'lot not found';
      end if;

      perform public.inv_apply_lot_deduction(
        v_req_item.sku_id,
        v_requisition.warehouse_id,
        v_alloc_lot_id,
        v_qty_issued,
        'requisition_issue',
        'requisition',
        p_requisition_id,
        v_actor_id,
        'Kitchen requisition issue (manual)',
        v_override_reason
      );

      insert into public.inv_requisition_issue_lines (
        requisition_item_id,
        lot_id,
        qty_issued,
        override_reason,
        overridden_by
      )
      values (
        v_req_item.id,
        v_alloc_lot_id,
        v_qty_issued,
        v_override_reason,
        case when v_override_reason is not null then v_actor_id else null end
      );
    else
      v_first_lot := null;

      for v_fefo in
        select * from public.inv_allocate_fefo(
          v_req_item.sku_id,
          v_requisition.warehouse_id,
          v_qty_issued,
          v_sku.default_issue_method
        )
      loop
        v_first_lot := coalesce(v_first_lot, v_fefo.lot_number);

        perform public.inv_apply_lot_deduction(
          v_req_item.sku_id,
          v_requisition.warehouse_id,
          v_fefo.lot_id,
          v_fefo.qty,
          'requisition_issue',
          'requisition',
          p_requisition_id,
          v_actor_id,
          'Kitchen requisition issue (FEFO)',
          null
        );

        insert into public.inv_requisition_issue_lines (
          requisition_item_id,
          lot_id,
          qty_issued
        )
        values (
          v_req_item.id,
          v_fefo.lot_id,
          v_fefo.qty
        );
      end loop;
    end if;

    select coalesce(v_first_lot, v_lot_number, l.lot_number)
    into v_lot_number
    from public.inv_requisition_issue_lines il
    join public.inv_stock_lots l on l.id = il.lot_id
    where il.requisition_item_id = v_req_item.id
    order by il.created_at asc
    limit 1;

    update public.inv_requisition_items
    set qty_issued = v_qty_issued,
        lot_number = v_lot_number
    where id = v_req_item.id;
  end loop;

  update public.inv_requisitions
  set status = 'issued',
      issued_by = v_actor_id,
      issued_at = now()
  where id = p_requisition_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- FEFO-008: Consumption with FEFO
-- ---------------------------------------------------------------------------

create or replace function public.inv_record_consumption(
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item jsonb;
  v_sku_id uuid;
  v_qty numeric;
  v_type text;
  v_notes text;
  v_stock_qty numeric;
  v_consumption_id uuid;
  v_ids uuid[] := '{}';
  v_sku public.inv_skus%rowtype;
  v_fefo record;
begin
  if not public.inv_is_active_employee() then
    raise exception 'forbidden';
  end if;

  v_actor_id := public.hr_employee_id();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'consumption items required';
  end if;

  perform public.inv_validate_branch_warehouse(p_branch_id, p_warehouse_id);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_sku_id := (v_item ->> 'sku_id')::uuid;
    v_qty := (v_item ->> 'qty')::numeric;
    v_type := v_item ->> 'consumption_type';
    v_notes := nullif(trim(coalesce(v_item ->> 'notes', '')), '');

    if v_qty <= 0 then
      raise exception 'quantity must be positive';
    end if;
    if v_type not in ('production', 'sampling', 'testing') then
      raise exception 'invalid consumption type';
    end if;

    select * into v_sku from public.inv_skus where id = v_sku_id and is_active = true;
    if not found then
      raise exception 'sku not active';
    end if;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_sku_id
      and warehouse_id = p_warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_qty then
      raise exception 'insufficient stock';
    end if;

    insert into public.inv_consumptions (
      branch_id,
      warehouse_id,
      sku_id,
      qty,
      consumption_type,
      recorded_by,
      notes
    )
    values (
      p_branch_id,
      p_warehouse_id,
      v_sku_id,
      v_qty,
      v_type,
      v_actor_id,
      coalesce(v_notes, nullif(trim(coalesce(p_notes, '')), ''))
    )
    returning id into v_consumption_id;

    for v_fefo in
      select * from public.inv_allocate_fefo(v_sku_id, p_warehouse_id, v_qty, v_sku.default_issue_method)
    loop
      perform public.inv_apply_lot_deduction(
        v_sku_id,
        p_warehouse_id,
        v_fefo.lot_id,
        v_fefo.qty,
        'consumption',
        'consumption',
        v_consumption_id,
        v_actor_id,
        coalesce(v_notes, p_notes, 'Inventory consumption'),
        null
      );
    end loop;

    v_ids := array_append(v_ids, v_consumption_id);
  end loop;

  return v_ids;
end;
$$;

-- ---------------------------------------------------------------------------
-- FEFO-010: Damage approve with lot
-- ---------------------------------------------------------------------------

create or replace function public.inv_approve_damage(p_damage_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_damage public.inv_damages%rowtype;
  v_stock_qty numeric;
  v_lot_status text;
  v_fefo record;
begin
  select * into v_damage
  from public.inv_damages
  where id = p_damage_id
  for update;

  if not found then
    raise exception 'damage report not found';
  end if;
  if v_damage.status <> 'pending' then
    raise exception 'damage report must be pending';
  end if;
  if v_damage.approval_required_role = 'auto' then
    if v_damage.created_by <> public.hr_employee_id()
      and not public.inv_can_approve_damage()
    then
      raise exception 'forbidden';
    end if;
  elsif not public.inv_can_approve_damage() then
    raise exception 'forbidden';
  end if;
  if v_damage.approval_required_role = 'admin' and not public.inv_can_admin_damage() then
    raise exception 'admin approval required';
  end if;

  v_actor_id := public.hr_employee_id();

  select quantity into v_stock_qty
  from public.inv_stock_balances
  where sku_id = v_damage.sku_id
    and warehouse_id = v_damage.warehouse_id
  for update;

  if coalesce(v_stock_qty, 0) < v_damage.qty then
    raise exception 'insufficient stock';
  end if;

  v_lot_status := case v_damage.damage_type
    when 'expired' then 'expired'
    when 'damaged' then 'damaged'
    when 'spoiled' then 'damaged'
    else 'depleted'
  end;

  if v_damage.lot_id is not null then
    perform public.inv_apply_lot_deduction(
      v_damage.sku_id,
      v_damage.warehouse_id,
      v_damage.lot_id,
      v_damage.qty,
      'damage',
      'damage',
      p_damage_id,
      v_actor_id,
      'Inventory damage approved',
      null
    );

    update public.inv_stock_lots
    set status = v_lot_status,
        updated_at = now()
    where id = v_damage.lot_id
      and remaining_qty = 0;
  else
    for v_fefo in
      select * from public.inv_allocate_fefo(
        v_damage.sku_id,
        v_damage.warehouse_id,
        v_damage.qty,
        'fefo'
      )
    loop
      perform public.inv_apply_lot_deduction(
        v_damage.sku_id,
        v_damage.warehouse_id,
        v_fefo.lot_id,
        v_fefo.qty,
        'damage',
        'damage',
        p_damage_id,
        v_actor_id,
        'Inventory damage approved (FEFO)',
        null
      );

      update public.inv_stock_lots
      set status = v_lot_status,
          updated_at = now()
      where id = v_fefo.lot_id
        and remaining_qty = 0;
    end loop;
  end if;

  update public.inv_damages
  set status = 'approved',
      approver_id = v_actor_id,
      approved_at = now(),
      rejected_at = null,
      rejection_reason = null
  where id = p_damage_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- FEFO-009: Transfer by lot_id (preserve expiry)
-- ---------------------------------------------------------------------------

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
  v_fefo record;
  v_sku public.inv_skus%rowtype;
  v_alloc_count integer;
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
    select * into v_sku from public.inv_skus where id = v_item.sku_id;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_item.sku_id
      and warehouse_id = v_transfer.from_warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_item.qty_sent then
      raise exception 'insufficient stock';
    end if;

    if v_item.lot_id is not null then
      perform public.inv_apply_lot_deduction(
        v_item.sku_id,
        v_transfer.from_warehouse_id,
        v_item.lot_id,
        v_item.qty_sent,
        'transfer_out',
        'transfer',
        p_transfer_id,
        v_actor_id,
        'Branch transfer sent',
        null
      );

      update public.inv_transfer_items
      set source_lot_id = v_item.lot_id,
          lot_number = (select lot_number from public.inv_stock_lots where id = v_item.lot_id)
      where id = v_item.id;
    else
      v_alloc_count := 0;
      for v_fefo in
        select * from public.inv_allocate_fefo(
          v_item.sku_id,
          v_transfer.from_warehouse_id,
          v_item.qty_sent,
          v_sku.default_issue_method
        )
      loop
        v_alloc_count := v_alloc_count + 1;
        if v_alloc_count > 1 then
          raise exception 'transfer spans multiple lots — specify lot_id per line';
        end if;

        perform public.inv_apply_lot_deduction(
          v_item.sku_id,
          v_transfer.from_warehouse_id,
          v_fefo.lot_id,
          v_fefo.qty,
          'transfer_out',
          'transfer',
          p_transfer_id,
          v_actor_id,
          'Branch transfer sent (FEFO)',
          null
        );

        update public.inv_transfer_items
        set source_lot_id = v_fefo.lot_id,
            lot_number = v_fefo.lot_number,
            lot_id = null
        where id = v_item.id;
      end loop;
    end if;
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
  v_source_lot public.inv_stock_lots%rowtype;
  v_dest_lot_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
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

    if v_qty_received > 0 and v_row.source_lot_id is not null then
      select * into v_source_lot
      from public.inv_stock_lots
      where id = v_row.source_lot_id;

      insert into public.inv_stock_lots (
        sku_id,
        warehouse_id,
        lot_number,
        batch_number,
        supplier_lot_ref,
        expiry_date,
        manufactured_date,
        received_date,
        received_qty,
        remaining_qty,
        unit_cost,
        status
      )
      values (
        v_row.sku_id,
        v_transfer.to_warehouse_id,
        v_source_lot.lot_number || '-T' || left(p_transfer_id::text, 6),
        v_source_lot.batch_number,
        v_source_lot.supplier_lot_ref,
        v_source_lot.expiry_date,
        v_source_lot.manufactured_date,
        current_date,
        v_qty_received,
        v_qty_received,
        v_source_lot.unit_cost,
        case
          when v_source_lot.expiry_date is not null and v_source_lot.expiry_date < current_date
            then 'expired'
          else 'available'
        end
      )
      returning id into v_dest_lot_id;

      select quantity into v_balance_before
      from public.inv_stock_balances
      where sku_id = v_row.sku_id
        and warehouse_id = v_transfer.to_warehouse_id
      for update;

      insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
      values (v_row.sku_id, v_transfer.to_warehouse_id, v_qty_received)
      on conflict (sku_id, warehouse_id) do update
        set quantity = public.inv_stock_balances.quantity + excluded.quantity,
            updated_at = now();

      v_balance_after := coalesce(v_balance_before, 0) + v_qty_received;

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
        v_row.sku_id,
        v_transfer.to_warehouse_id,
        'transfer_in',
        v_qty_received,
        'transfer',
        p_transfer_id,
        v_dest_lot_id,
        (select lot_number from public.inv_stock_lots where id = v_dest_lot_id),
        v_balance_before,
        v_balance_after,
        v_actor_id,
        'Branch transfer received'
      );

      update public.inv_transfer_items
      set qty_received = v_qty_received,
          lot_id = v_dest_lot_id,
          updated_at = now()
      where id = v_row.id;
    else
      update public.inv_transfer_items
      set qty_received = v_qty_received,
          updated_at = now()
      where id = v_row.id;
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
