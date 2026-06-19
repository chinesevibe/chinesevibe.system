


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;









CREATE OR REPLACE FUNCTION "public"."hr_can_access_branch"("p_branch_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select hr_is_hr_admin()
    or (hr_is_branch_manager() and hr_managed_branch_id() = p_branch_id)
$$;


ALTER FUNCTION "public"."hr_can_access_branch"("p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_can_read_company"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select hr_is_hr_admin() or hr_is_ceo()
$$;


ALTER FUNCTION "public"."hr_can_read_company"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_employee_branch_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select branch_id from public.hr_employees where id = hr_employee_id()
$$;


ALTER FUNCTION "public"."hr_employee_branch_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_employee_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id from hr_employees where line_user_id = hr_line_user_id()
$$;


ALTER FUNCTION "public"."hr_employee_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_branch_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'branch_manager'
  )
$$;


ALTER FUNCTION "public"."hr_is_branch_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_ceo"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'ceo'
  )
$$;


ALTER FUNCTION "public"."hr_is_ceo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_dev"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.hr_employees
    where line_user_id = hr_line_user_id() and role = 'dev'
  )
$$;


ALTER FUNCTION "public"."hr_is_dev"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_hr_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."hr_is_hr_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_line_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    nullif(auth.jwt() ->> 'line_user_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'line_user_id', '')
  )
$$;


ALTER FUNCTION "public"."hr_line_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_managed_branch_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select b.id
  from public.hr_branches b
  join public.hr_employees e on e.id = b.manager_employee_id
  where e.line_user_id = hr_line_user_id()
  limit 1
$$;


ALTER FUNCTION "public"."hr_managed_branch_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_payroll_config_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."hr_payroll_config_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_payroll_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."hr_payroll_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_runtime_config_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."hr_runtime_config_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."hr_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text" DEFAULT NULL::"text") RETURNS TABLE("lot_id" "uuid", "lot_number" "text", "expiry_date" "date", "received_date" "date", "qty" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_method text;
  v_remaining numeric := p_qty;
  v_lot public.inv_stock_lots%rowtype;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select coalesce(p_issue_method, s.default_issue_method)
  into v_method
  from public.inv_skus s
  where s.id = p_sku_id;

  if v_method is null then
    v_method := 'fefo';
  end if;

  for v_lot in
    select *
    from public.inv_stock_lots l
    where l.sku_id = p_sku_id
      and l.warehouse_id = p_warehouse_id
      and l.remaining_qty > 0
      and l.status = 'available'
      and (
        v_method = 'fifo'
        or l.expiry_date is null
        or l.expiry_date >= current_date
      )
    order by
      case when v_method = 'fifo' then l.received_date end asc nulls last,
      case when v_method in ('fefo', 'manual') then l.expiry_date end asc nulls last,
      l.received_date asc,
      l.id asc
  loop
    exit when v_remaining <= 0;

    lot_id := v_lot.id;
    lot_number := v_lot.lot_number;
    expiry_date := v_lot.expiry_date;
    received_date := v_lot.received_date;
    qty := least(v_lot.remaining_qty, v_remaining);
    v_remaining := v_remaining - qty;
    return next;
  end loop;

  if v_remaining > 0 then
    raise exception 'insufficient lot stock (short by %)', v_remaining;
  end if;
end;
$$;


ALTER FUNCTION "public"."inv_allocate_fefo"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_qty" numeric, "p_issue_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_override_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_lot public.inv_stock_lots%rowtype;
  v_before numeric;
  v_after numeric;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  if p_qty <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select * into v_lot
  from public.inv_stock_lots
  where id = p_lot_id
    and sku_id = p_sku_id
    and warehouse_id = p_warehouse_id
  for update;

  if not found then
    raise exception 'lot not found';
  end if;

  if v_lot.status not in ('available', 'reserved') then
    raise exception 'lot not available';
  end if;

  if v_lot.expiry_date is not null and v_lot.expiry_date < current_date then
    if p_override_reason is null or not public.inv_can_override_fefo() then
      raise exception 'lot expired';
    end if;
  end if;

  if v_lot.remaining_qty < p_qty then
    raise exception 'insufficient lot quantity';
  end if;

  v_before := v_lot.remaining_qty;
  v_after := v_lot.remaining_qty - p_qty;

  update public.inv_stock_lots
  set
    remaining_qty = v_after,
    status = case when v_after = 0 then 'depleted' else status end,
    updated_at = now()
  where id = p_lot_id;

  select quantity into v_balance_before
  from public.inv_stock_balances
  where sku_id = p_sku_id
    and warehouse_id = p_warehouse_id
  for update;

  update public.inv_stock_balances
  set quantity = quantity - p_qty,
      updated_at = now()
  where sku_id = p_sku_id
    and warehouse_id = p_warehouse_id;

  v_balance_after := coalesce(v_balance_before, 0) - p_qty;

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
    p_sku_id,
    p_warehouse_id,
    p_movement_type,
    -p_qty,
    p_reference_type,
    p_reference_id,
    p_lot_id,
    v_lot.lot_number,
    v_balance_before,
    v_balance_after,
    p_created_by,
    coalesce(p_notes, p_override_reason)
  );
end;
$$;


ALTER FUNCTION "public"."inv_apply_lot_deduction"("p_sku_id" "uuid", "p_warehouse_id" "uuid", "p_lot_id" "uuid", "p_qty" numeric, "p_movement_type" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_created_by" "uuid", "p_notes" "text", "p_override_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_approve_damage"("p_damage_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_approve_inbound_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_admin_damage"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('inventory', 'dev')
        )
      $$;


ALTER FUNCTION "public"."inv_can_admin_damage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_approve_damage"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('hr', 'inventory', 'dev')
        )
      $$;


ALTER FUNCTION "public"."inv_can_approve_damage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_manage_damage"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
        select exists (
          select 1
          from public.hr_employees e
          where e.id = public.hr_employee_id()
            and e.status = 'active'
            and e.role in ('hr', 'inventory', 'dev')
        )
      $$;


ALTER FUNCTION "public"."inv_can_manage_damage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_manage_requisitions"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'inventory', 'dev')
  )
$$;


ALTER FUNCTION "public"."inv_can_manage_requisitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_override_fefo"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'inventory', 'dev')
  )
$$;


ALTER FUNCTION "public"."inv_can_override_fefo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_can_view_inventory_ops"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.inv_can_manage_requisitions() or public.hr_is_ceo()
$$;


ALTER FUNCTION "public"."inv_can_view_inventory_ops"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_cancel_stock_count"("p_count_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_transfer public.inv_transfers%rowtype;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  select * into v_transfer
  from public.inv_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer not found';
  end if;

  if v_transfer.status <> 'draft' then
    raise exception 'only draft transfers can be cancelled';
  end if;

  update public.inv_transfers
  set status = 'cancelled',
      updated_at = now()
  where id = p_transfer_id;
end;
$$;


ALTER FUNCTION "public"."inv_cancel_transfer"("p_transfer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text" DEFAULT 'all'::"text", "p_planned_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_create_stock_count"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_scope" "text", "p_planned_at" timestamp with time zone, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
