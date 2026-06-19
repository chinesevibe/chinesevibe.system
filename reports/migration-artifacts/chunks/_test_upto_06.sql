


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


ALTER FUNCTION "public"."inv_finalize_stock_count"("p_count_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_is_active_employee"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
  )
$$;


ALTER FUNCTION "public"."inv_is_active_employee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_issue_requisition"("p_requisition_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_latest_sku_cost"("p_sku_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select i.cost_per_unit
  from public.inv_inbound_items i
  join public.inv_inbound_orders o on o.id = i.inbound_order_id
  where i.sku_id = p_sku_id
    and i.cost_per_unit is not null
    and i.cost_per_unit >= 0
    and o.status = 'approved'
  order by coalesce(o.received_date, o.updated_at, o.created_at) desc, i.created_at desc
  limit 1
$$;


ALTER FUNCTION "public"."inv_latest_sku_cost"("p_sku_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_receive_transfer"("p_transfer_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_record_consumption"("p_branch_id" "uuid", "p_warehouse_id" "uuid", "p_items" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_actor_id uuid;
  v_damage public.inv_damages%rowtype;
begin
  if not public.inv_can_approve_damage() then
    raise exception 'forbidden';
  end if;

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
  if v_damage.approval_required_role = 'admin' and not public.inv_can_admin_damage() then
    raise exception 'admin approval required';
  end if;

  v_actor_id := public.hr_employee_id();

  update public.inv_damages
  set status = 'rejected',
      approver_id = v_actor_id,
      rejected_at = now(),
      approved_at = null,
      rejection_reason = nullif(trim(p_rejection_reason), '')
  where id = p_damage_id;
end;
$$;


ALTER FUNCTION "public"."inv_reject_damage"("p_damage_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_save_stock_count_items"("p_count_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."inv_send_transfer"("p_transfer_id" "uuid", "p_shipper" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") RETURNS "void"
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


ALTER FUNCTION "public"."inv_start_stock_count"("p_count_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from public.inv_warehouses w
    where w.id = p_warehouse_id
      and w.branch_id = p_branch_id
      and w.is_active = true
  ) then
    raise exception 'warehouse does not belong to branch';
  end if;
end;
$$;


ALTER FUNCTION "public"."inv_validate_branch_warehouse"("p_branch_id" "uuid", "p_warehouse_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."hr_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "trigger_date" "date" NOT NULL,
    "sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_alerts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."hr_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "target_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "target_value" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp with time zone,
    "image_path" "text",
    CONSTRAINT "hr_announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sent'::"text"]))),
    CONSTRAINT "hr_announcements_target_type_check" CHECK (("target_type" = ANY (ARRAY['all'::"text", 'department'::"text"])))
);


ALTER TABLE "public"."hr_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "check_in_at" timestamp with time zone NOT NULL,
    "check_out_at" timestamp with time zone,
    "check_in_location" "jsonb",
    "is_late" boolean DEFAULT false NOT NULL,
    "work_hours" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_shift_id" "uuid",
    "shift_date" "date",
    "check_out_location" "jsonb",
    "location_review_status" "text" DEFAULT 'clear'::"text" NOT NULL,
    "location_review_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "location_review_note" "text",
    "location_reviewed_by" "uuid",
    "location_reviewed_at" timestamp with time zone,
    CONSTRAINT "hr_attendance_location_review_status_check" CHECK (("location_review_status" = ANY (ARRAY['clear'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_attendance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_attendance"."check_in_location" IS 'Raw check-in location payload including lat/lng and optional anti-spoof metadata';



COMMENT ON COLUMN "public"."hr_attendance"."work_shift_id" IS 'Shift snapshot at check-in';



COMMENT ON COLUMN "public"."hr_attendance"."shift_date" IS 'Logical shift day (important for overnight shifts)';



COMMENT ON COLUMN "public"."hr_attendance"."check_out_location" IS 'Raw check-out location payload including lat/lng and optional anti-spoof metadata';



COMMENT ON COLUMN "public"."hr_attendance"."location_review_status" IS 'Location trust state: clear, pending_hr, approved, rejected';



COMMENT ON COLUMN "public"."hr_attendance"."location_review_flags" IS 'Suspicious location flags collected during check-in/out review';



CREATE TABLE IF NOT EXISTS "public"."hr_attendance_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "correction_type" "text" NOT NULL,
    "source" "text" DEFAULT 'employee'::"text" NOT NULL,
    "attendance_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_attendance_corrections_correction_type_check" CHECK (("correction_type" = ANY (ARRAY['checkin'::"text", 'checkout'::"text"]))),
    CONSTRAINT "hr_attendance_corrections_source_check" CHECK (("source" = ANY (ARRAY['employee'::"text", 'hr'::"text"])))
);


ALTER TABLE "public"."hr_attendance_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_attendance_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attendance_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "approval_status" "text" DEFAULT 'pending_manager'::"text" NOT NULL,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_attendance_submissions_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."hr_attendance_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "manager_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "geofence_radius_m" integer DEFAULT 200 NOT NULL,
    "geofence_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "hr_branches_geofence_radius_m_check" CHECK ((("geofence_radius_m" > 0) AND ("geofence_radius_m" <= 200)))
);


ALTER TABLE "public"."hr_branches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_branches"."address" IS 'ที่อยู่สาขา — แสดงใน Branch detail';



COMMENT ON COLUMN "public"."hr_branches"."latitude" IS 'ศูนย์ geofence — ละติจูด';



COMMENT ON COLUMN "public"."hr_branches"."longitude" IS 'ศูนย์ geofence — ลองจิจูด';



COMMENT ON COLUMN "public"."hr_branches"."geofence_radius_m" IS 'รัศมี geofence (สูงสุด 200m)';



COMMENT ON COLUMN "public"."hr_branches"."geofence_enabled" IS 'เปิด geofence สำหรับเช็คอิน/ออก — Head Office (000) ไม่ใช้';



CREATE TABLE IF NOT EXISTS "public"."hr_complaint_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "complaint_id" "uuid" NOT NULL,
    "author_employee_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_complaint_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "ticket_code" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_complaints_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'replied'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."hr_complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_compliance_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_compliance_notes_category_check" CHECK (("category" = ANY (ARRAY['probation'::"text", 'visa'::"text", 'work_permit'::"text", 'contract'::"text", 'blacklist'::"text"])))
);


ALTER TABLE "public"."hr_compliance_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "branch_id" "uuid"
);


ALTER TABLE "public"."hr_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_document_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "doc_type" "text" NOT NULL,
    "copies" smallint DEFAULT 1 NOT NULL,
    "purpose" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "hr_note" "text",
    "result_file_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_document_requests_copies_check" CHECK ((("copies" >= 1) AND ("copies" <= 10))),
    CONSTRAINT "hr_document_requests_doc_type_check" CHECK (("doc_type" = ANY (ARRAY['employment_cert'::"text", 'salary_cert'::"text", 'tax_cert'::"text", 'other'::"text"]))),
    CONSTRAINT "hr_document_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'on_hold'::"text", 'processing'::"text", 'ready'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_document_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text",
    "name" "text" NOT NULL,
    "position" "text",
    "department" "text",
    "salary" numeric(12,2),
    "contract_start" "date",
    "probation_end" "date",
    "visa_expiry" "date",
    "work_permit_expiry" "date",
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_of_birth" "date",
    "phone" "text",
    "email" "text",
    "contract_type" "text",
    "contract_end" "date",
    "probation_outcome" "text",
    "probation_outcome_note" "text",
    "probation_extended_until" "date",
    "branch_id" "uuid",
    "department_id" "uuid",
    "employee_code" "text",
    "salary_payment_method" "text",
    "bank_name" "text",
    "bank_account_name" "text",
    "bank_account_number" "text",
    "bank_branch" "text",
    "leave_blacklisted" boolean DEFAULT false NOT NULL,
    "leave_blacklist_reason" "text",
    "leave_blacklisted_at" timestamp with time zone,
    "avatar_path" "text",
    "contract_file_path" "text",
    "contract_file_name" "text",
    "contract_uploaded_at" timestamp with time zone,
    "work_shift_id" "uuid",
    "default_check_in_time" time without time zone,
    "default_check_out_time" time without time zone,
    "pay_type" "text" DEFAULT 'hourly'::"text" NOT NULL,
    "nationality" "text",
    "pay_day" smallint,
    "preferred_locale" "text" DEFAULT 'th'::"text" NOT NULL,
    "locale_source" "text" DEFAULT 'line'::"text" NOT NULL,
    "housing_allowance" numeric(12,2),
    "portal_password_hash" "text",
    CONSTRAINT "hr_employees_contract_type_check" CHECK ((("contract_type" IS NULL) OR ("contract_type" = ANY (ARRAY['full_time'::"text", 'part_time'::"text", 'contract'::"text"])))),
    CONSTRAINT "hr_employees_locale_source_check" CHECK (("locale_source" = ANY (ARRAY['line'::"text", 'manual'::"text"]))),
    CONSTRAINT "hr_employees_nationality_check" CHECK ((("nationality" IS NULL) OR ("nationality" = ANY (ARRAY['thai'::"text", 'myanmar'::"text", 'chinese'::"text"])))),
    CONSTRAINT "hr_employees_pay_day_check" CHECK ((("pay_day" IS NULL) OR ("pay_day" = ANY (ARRAY[4, 5])))),
    CONSTRAINT "hr_employees_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['monthly'::"text", 'hourly'::"text"]))),
    CONSTRAINT "hr_employees_preferred_locale_check" CHECK (("preferred_locale" = ANY (ARRAY['th'::"text", 'en'::"text", 'zh'::"text", 'my'::"text"]))),
    CONSTRAINT "hr_employees_probation_outcome_check" CHECK ((("probation_outcome" IS NULL) OR ("probation_outcome" = ANY (ARRAY['passed'::"text", 'failed'::"text", 'extended'::"text"])))),
    CONSTRAINT "hr_employees_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'hr'::"text", 'inventory'::"text", 'branch_manager'::"text", 'ceo'::"text", 'dev'::"text"]))),
    CONSTRAINT "hr_employees_salary_payment_method_check" CHECK ((("salary_payment_method" IS NULL) OR ("salary_payment_method" = ANY (ARRAY['cash'::"text", 'bank'::"text"])))),
    CONSTRAINT "hr_employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."hr_employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_employees"."salary_payment_method" IS 'cash = รับเงินสด, bank = โอนเข้าบัญชีธนาคาร';



COMMENT ON COLUMN "public"."hr_employees"."work_shift_id" IS 'HR-assigned shift; used by check-in/out (Phase 3)';



COMMENT ON COLUMN "public"."hr_employees"."default_check_in_time" IS 'Employee-level default check-in time. Used as attendance fallback when no shift is assigned.';



COMMENT ON COLUMN "public"."hr_employees"."default_check_out_time" IS 'Employee-level default check-out time. Used as attendance fallback when no shift is assigned.';



COMMENT ON COLUMN "public"."hr_employees"."nationality" IS 'thai | myanmar | chinese — drives default pay_day';



COMMENT ON COLUMN "public"."hr_employees"."pay_day" IS 'Payroll transfer day of month (4 or 5). Overrides nationality default when set.';



COMMENT ON COLUMN "public"."hr_employees"."preferred_locale" IS 'UI language: th=Thai, en=English, zh=Chinese, my=Myanmar (Burmese)';



COMMENT ON COLUMN "public"."hr_employees"."locale_source" IS 'line = follow LINE app language (LIFF sync); manual = user picked in Portal';



COMMENT ON COLUMN "public"."hr_employees"."portal_password_hash" IS 'Scrypt hash for employee-code portal login; required for Officer department staff.';



CREATE TABLE IF NOT EXISTS "public"."hr_leave_balances" (
    "employee_id" "uuid" NOT NULL,
    "leave_type" "text" NOT NULL,
    "total_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "used_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leave_policy_defaults" (
    "leave_type" "text" NOT NULL,
    "annual_days" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_leave_policy_defaults_leave_type_check" CHECK (("leave_type" = ANY (ARRAY['sick'::"text", 'personal'::"text", 'annual'::"text", 'maternity'::"text", 'unpaid'::"text", 'emergency'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."hr_leave_policy_defaults" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leaves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "attachment_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decision_note" "text",
    "leave_unit" "text" DEFAULT 'days'::"text" NOT NULL,
    "leave_hours" numeric(5,2),
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "approval_status" "text" DEFAULT 'pending_manager'::"text" NOT NULL,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "medical_certificate_url" "text",
    CONSTRAINT "hr_leaves_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "hr_leaves_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "hr_leaves_leave_unit_check" CHECK (("leave_unit" = ANY (ARRAY['days'::"text", 'hours'::"text"]))),
    CONSTRAINT "hr_leaves_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_leaves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_line_pending_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "line_user_id" "text" NOT NULL,
    "approver_employee_id" "uuid" NOT NULL,
    "action_kind" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_line_pending_actions_action_kind_check" CHECK (("action_kind" = ANY (ARRAY['reject_leave'::"text", 'reject_ot'::"text", 'reject_registration'::"text", 'reject_document'::"text", 'reject_attendance'::"text", 'complaint_reply'::"text", 'complaint_close'::"text"])))
);


ALTER TABLE "public"."hr_line_pending_actions" OWNER TO "postgres";


COMMENT ON TABLE "public"."hr_line_pending_actions" IS 'LINE OA pending HR text input (reject reason / complaint reply). Service role only.';



CREATE TABLE IF NOT EXISTS "public"."hr_overtime_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "decision_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_by" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approval_status" "text" DEFAULT 'pending_hr'::"text" NOT NULL,
    "hr_decided_by" "uuid",
    "hr_decided_at" timestamp with time zone,
    "manager_decided_by" "uuid",
    "manager_decided_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    CONSTRAINT "hr_overtime_end_after_start" CHECK (("end_time" > "start_time")),
    CONSTRAINT "hr_overtime_requests_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending_manager'::"text", 'pending_hr'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "hr_overtime_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_overtime_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_payroll_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_hour_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "line_type" "text" NOT NULL,
    "hours" numeric(8,2) NOT NULL,
    "work_date" "date" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_hour_lines_line_type_check" CHECK (("line_type" = ANY (ARRAY['regular'::"text", 'overtime'::"text", 'sick_hourly'::"text"])))
);


ALTER TABLE "public"."hr_payroll_hour_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_periods_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."hr_payroll_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payroll_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "cutoff_day" integer,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "employee_count" integer DEFAULT 0 NOT NULL,
    "total_gross" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_net" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payroll_runs_cutoff_day_check" CHECK ((("cutoff_day" >= 1) AND ("cutoff_day" <= 31))),
    CONSTRAINT "hr_payroll_runs_period_check" CHECK (("period" ~ '^\d{4}-\d{2}$'::"text")),
    CONSTRAINT "hr_payroll_runs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'locked'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."hr_payroll_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payslip_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payslip_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_payslip_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_payslips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "pay_type" "text" NOT NULL,
    "pay_day" integer NOT NULL,
    "payment_date" "date" NOT NULL,
    "gross_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "sso_deduction" numeric(12,2) DEFAULT 0 NOT NULL,
    "other_deductions" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_deduction" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "pdf_path" "text",
    "regular_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "ot_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "sick_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "annual_hours" numeric(8,2) DEFAULT 0 NOT NULL,
    "base_rate" numeric(12,2),
    "monthly_salary" numeric(12,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_payslips_pay_day_check" CHECK (("pay_day" = ANY (ARRAY[4, 5]))),
    CONSTRAINT "hr_payslips_pay_type_check" CHECK (("pay_type" = ANY (ARRAY['monthly'::"text", 'hourly'::"text"]))),
    CONSTRAINT "hr_payslips_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'final'::"text"])))
);


ALTER TABLE "public"."hr_payslips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid",
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_runtime_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_runtime_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_work_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "start_hour" smallint NOT NULL,
    "start_minute" smallint DEFAULT 0 NOT NULL,
    "end_hour" smallint NOT NULL,
    "end_minute" smallint DEFAULT 0 NOT NULL,
    "crosses_midnight" boolean DEFAULT false NOT NULL,
    "grace_minutes" smallint DEFAULT 10 NOT NULL,
    "standard_hours" numeric(4,2) NOT NULL,
    "check_in_early_minutes" smallint DEFAULT 60 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_work_shifts_check_in_early_minutes_check" CHECK ((("check_in_early_minutes" >= 0) AND ("check_in_early_minutes" <= 240))),
    CONSTRAINT "hr_work_shifts_end_hour_check" CHECK ((("end_hour" >= 0) AND ("end_hour" <= 23))),
    CONSTRAINT "hr_work_shifts_end_minute_check" CHECK ((("end_minute" >= 0) AND ("end_minute" <= 59))),
    CONSTRAINT "hr_work_shifts_grace_minutes_check" CHECK ((("grace_minutes" >= 0) AND ("grace_minutes" <= 120))),
    CONSTRAINT "hr_work_shifts_standard_hours_check" CHECK ((("standard_hours" > (0)::numeric) AND ("standard_hours" <= (24)::numeric))),
    CONSTRAINT "hr_work_shifts_start_hour_check" CHECK ((("start_hour" >= 0) AND ("start_hour" <= 23))),
    CONSTRAINT "hr_work_shifts_start_minute_check" CHECK ((("start_minute" >= 0) AND ("start_minute" <= 59)))
);


ALTER TABLE "public"."hr_work_shifts" OWNER TO "postgres";


COMMENT ON TABLE "public"."hr_work_shifts" IS 'Master work shift templates for attendance late/OT rules';



CREATE TABLE IF NOT EXISTS "public"."inv_boms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid",
    "ingredient_sku_id" "uuid",
    "quantity" numeric NOT NULL,
    "unit_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_boms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hr_branch_id" "uuid"
);


ALTER TABLE "public"."inv_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_consumptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "consumption_type" "text" NOT NULL,
    "recorded_by" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_consumptions_consumption_type_check" CHECK (("consumption_type" = ANY (ARRAY['production'::"text", 'sampling'::"text", 'testing'::"text"]))),
    CONSTRAINT "inv_consumptions_qty_check" CHECK (("qty" > (0)::numeric))
);


ALTER TABLE "public"."inv_consumptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_damages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "damage_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "photo_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cost_value" numeric NOT NULL,
    "approval_required_role" "text" DEFAULT 'hr'::"text" NOT NULL,
    "auto_approved" boolean DEFAULT false NOT NULL,
    "approver_id" "uuid",
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "lot_id" "uuid",
    CONSTRAINT "inv_damages_approval_required_role_check" CHECK (("approval_required_role" = ANY (ARRAY['auto'::"text", 'hr'::"text", 'admin'::"text"]))),
    CONSTRAINT "inv_damages_approved_has_approver" CHECK ((("status" <> 'approved'::"text") OR (("approver_id" IS NOT NULL) AND ("approved_at" IS NOT NULL)))),
    CONSTRAINT "inv_damages_cost_value_check" CHECK (("cost_value" >= (0)::numeric)),
    CONSTRAINT "inv_damages_damage_type_check" CHECK (("damage_type" = ANY (ARRAY['damaged'::"text", 'spoiled'::"text", 'expired'::"text", 'lost'::"text", 'adjustment'::"text"]))),
    CONSTRAINT "inv_damages_pending_has_no_decision" CHECK ((("status" <> 'pending'::"text") OR (("approved_at" IS NULL) AND ("rejected_at" IS NULL)))),
    CONSTRAINT "inv_damages_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "inv_damages_reason_check" CHECK (("length"(TRIM(BOTH FROM "reason")) > 0)),
    CONSTRAINT "inv_damages_rejected_has_timestamp" CHECK ((("status" <> 'rejected'::"text") OR ("rejected_at" IS NOT NULL))),
    CONSTRAINT "inv_damages_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."inv_damages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_inbound_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inbound_order_id" "uuid" NOT NULL,
    "sku_id" "uuid",
    "quantity" numeric NOT NULL,
    "cost_per_unit" numeric,
    "lot_number" "text",
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_inbound_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_inbound_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "warehouse_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "received_date" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_inbound_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inv_inbound_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisition_issue_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_item_id" "uuid" NOT NULL,
    "lot_id" "uuid" NOT NULL,
    "qty_issued" numeric NOT NULL,
    "override_reason" "text",
    "overridden_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_requisition_issue_lines_qty_issued_check" CHECK (("qty_issued" > (0)::numeric))
);


ALTER TABLE "public"."inv_requisition_issue_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisition_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_requested" numeric NOT NULL,
    "qty_approved" numeric DEFAULT 0 NOT NULL,
    "qty_issued" numeric DEFAULT 0 NOT NULL,
    "qty_received" numeric DEFAULT 0 NOT NULL,
    "lot_number" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_req_items_qty_approved_lte_requested" CHECK (("qty_approved" <= "qty_requested")),
    CONSTRAINT "inv_req_items_qty_issued_lte_approved" CHECK (("qty_issued" <= "qty_approved")),
    CONSTRAINT "inv_req_items_qty_received_lte_issued" CHECK (("qty_received" <= "qty_issued")),
    CONSTRAINT "inv_requisition_items_qty_approved_check" CHECK (("qty_approved" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_issued_check" CHECK (("qty_issued" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_received_check" CHECK (("qty_received" >= (0)::numeric)),
    CONSTRAINT "inv_requisition_items_qty_requested_check" CHECK (("qty_requested" > (0)::numeric))
);


ALTER TABLE "public"."inv_requisition_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_requisitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notes" "text",
    "rejection_reason" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "issued_by" "uuid",
    "issued_at" timestamp with time zone,
    "received_by" "uuid",
    "received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_requisitions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'issued'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."inv_requisitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_skus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "unit_id" "uuid",
    "barcode" "text",
    "min_stock" numeric DEFAULT 0 NOT NULL,
    "max_stock" numeric DEFAULT 0 NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expiry_required" boolean DEFAULT false NOT NULL,
    "lot_tracking_required" boolean DEFAULT true NOT NULL,
    "default_issue_method" "text" DEFAULT 'fefo'::"text" NOT NULL,
    "shelf_life_days" integer,
    "storage_type" "text",
    CONSTRAINT "inv_skus_default_issue_method_check" CHECK (("default_issue_method" = ANY (ARRAY['fefo'::"text", 'fifo'::"text", 'manual'::"text"]))),
    CONSTRAINT "inv_skus_shelf_life_days_check" CHECK ((("shelf_life_days" IS NULL) OR ("shelf_life_days" > 0))),
    CONSTRAINT "inv_skus_storage_type_check" CHECK ((("storage_type" IS NULL) OR ("storage_type" = ANY (ARRAY['dry'::"text", 'chilled'::"text", 'frozen'::"text"]))))
);


ALTER TABLE "public"."inv_skus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid",
    "warehouse_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_delta" numeric NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "applied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_adjustments_qty_delta_check" CHECK (("qty_delta" <> (0)::numeric)),
    CONSTRAINT "inv_stock_adjustments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text"])))
);


ALTER TABLE "public"."inv_stock_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_stock_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_count_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "count_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "system_qty" numeric NOT NULL,
    "physical_qty" numeric,
    "lot_number" "text",
    "counted_by" "uuid",
    "counted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    CONSTRAINT "inv_stock_count_items_physical_qty_check" CHECK ((("physical_qty" IS NULL) OR ("physical_qty" >= (0)::numeric))),
    CONSTRAINT "inv_stock_count_items_system_qty_check" CHECK (("system_qty" >= (0)::numeric))
);


ALTER TABLE "public"."inv_stock_count_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_counts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "scope" "text" DEFAULT 'all'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "planned_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_counts_scope_check" CHECK (("scope" = ANY (ARRAY['all'::"text", 'category'::"text", 'sku'::"text"]))),
    CONSTRAINT "inv_stock_counts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'counting'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inv_stock_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_lots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "lot_number" "text" NOT NULL,
    "batch_number" "text",
    "supplier_lot_ref" "text",
    "expiry_date" "date",
    "manufactured_date" "date",
    "received_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "received_qty" numeric NOT NULL,
    "remaining_qty" numeric NOT NULL,
    "unit_cost" numeric,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "inbound_item_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_stock_lots_received_qty_check" CHECK (("received_qty" > (0)::numeric)),
    CONSTRAINT "inv_stock_lots_remaining_lte_received" CHECK (("remaining_qty" <= "received_qty")),
    CONSTRAINT "inv_stock_lots_remaining_qty_check" CHECK (("remaining_qty" >= (0)::numeric)),
    CONSTRAINT "inv_stock_lots_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'reserved'::"text", 'expired'::"text", 'damaged'::"text", 'depleted'::"text"])))
);


ALTER TABLE "public"."inv_stock_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "lot_number" "text",
    "created_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    "qty_before" numeric,
    "qty_after" numeric,
    CONSTRAINT "inv_stock_movements_quantity_nonzero" CHECK (("quantity" <> (0)::numeric))
);


ALTER TABLE "public"."inv_stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "contact" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_transfer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transfer_id" "uuid" NOT NULL,
    "sku_id" "uuid" NOT NULL,
    "qty_sent" numeric NOT NULL,
    "qty_received" numeric DEFAULT 0 NOT NULL,
    "lot_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lot_id" "uuid",
    "source_lot_id" "uuid",
    CONSTRAINT "inv_transfer_items_qty_received_check" CHECK (("qty_received" >= (0)::numeric)),
    CONSTRAINT "inv_transfer_items_qty_received_lte_sent" CHECK (("qty_received" <= "qty_sent")),
    CONSTRAINT "inv_transfer_items_qty_sent_check" CHECK (("qty_sent" > (0)::numeric))
);


ALTER TABLE "public"."inv_transfer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_warehouse_id" "uuid" NOT NULL,
    "to_warehouse_id" "uuid" NOT NULL,
    "from_branch_id" "uuid" NOT NULL,
    "to_branch_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "shipper" "text",
    "created_by" "uuid" NOT NULL,
    "sent_by" "uuid",
    "received_by" "uuid",
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_transfers_branches_distinct" CHECK (("from_branch_id" <> "to_branch_id")),
    CONSTRAINT "inv_transfers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_transit'::"text", 'received'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "inv_transfers_warehouses_distinct" CHECK (("from_warehouse_id" <> "to_warehouse_id"))
);


ALTER TABLE "public"."inv_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_unit_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_unit_id" "uuid",
    "to_unit_id" "uuid",
    "factor" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "abbreviation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inv_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inv_warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'main'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inv_warehouses_type_check" CHECK (("type" = ANY (ARRAY['main'::"text", 'sub'::"text"])))
);


ALTER TABLE "public"."inv_warehouses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."hr_alerts"
    ADD CONSTRAINT "hr_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_announcements"
    ADD CONSTRAINT "hr_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance_corrections"
    ADD CONSTRAINT "hr_attendance_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_attendance_id_key" UNIQUE ("attendance_id");



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_manager_employee_id_key" UNIQUE ("manager_employee_id");



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaint_replies"
    ADD CONSTRAINT "hr_complaint_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaints"
    ADD CONSTRAINT "hr_complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_complaints"
    ADD CONSTRAINT "hr_complaints_ticket_code_key" UNIQUE ("ticket_code");



ALTER TABLE ONLY "public"."hr_compliance_notes"
    ADD CONSTRAINT "hr_compliance_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_departments"
    ADD CONSTRAINT "hr_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_document_requests"
    ADD CONSTRAINT "hr_document_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_line_user_id_key" UNIQUE ("line_user_id");



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("employee_id", "leave_type");



ALTER TABLE ONLY "public"."hr_leave_policy_defaults"
    ADD CONSTRAINT "hr_leave_policy_defaults_pkey" PRIMARY KEY ("leave_type");



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_line_pending_actions"
    ADD CONSTRAINT "hr_line_pending_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_config"
    ADD CONSTRAINT "hr_payroll_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_source_type_source_id_key" UNIQUE ("source_type", "source_id");



ALTER TABLE ONLY "public"."hr_payroll_periods"
    ADD CONSTRAINT "hr_payroll_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payroll_periods"
    ADD CONSTRAINT "hr_payroll_periods_year_month_branch_id_key" UNIQUE ("year", "month", "branch_id");



ALTER TABLE ONLY "public"."hr_payroll_runs"
    ADD CONSTRAINT "hr_payroll_runs_period_key" UNIQUE ("period");



ALTER TABLE ONLY "public"."hr_payroll_runs"
    ADD CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslip_lines"
    ADD CONSTRAINT "hr_payslip_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_run_id_employee_id_key" UNIQUE ("run_id", "employee_id");



ALTER TABLE ONLY "public"."hr_positions"
    ADD CONSTRAINT "hr_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_runtime_config"
    ADD CONSTRAINT "hr_runtime_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hr_work_shifts"
    ADD CONSTRAINT "hr_work_shifts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hr_work_shifts"
    ADD CONSTRAINT "hr_work_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_boms"
    ADD CONSTRAINT "inv_boms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_branches"
    ADD CONSTRAINT "inv_branches_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_branches"
    ADD CONSTRAINT "inv_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_sku_id_warehouse_id_key" UNIQUE ("sku_id", "warehouse_id");



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_warehouse_sku_lot_unique" UNIQUE ("warehouse_id", "sku_id", "lot_number");



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_suppliers"
    ADD CONSTRAINT "inv_suppliers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_suppliers"
    ADD CONSTRAINT "inv_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_transfer_sku_unique" UNIQUE ("transfer_id", "sku_id");



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_units"
    ADD CONSTRAINT "inv_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_warehouses"
    ADD CONSTRAINT "inv_warehouses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inv_warehouses"
    ADD CONSTRAINT "inv_warehouses_pkey" PRIMARY KEY ("id");



CREATE INDEX "hr_alerts_employee_id_idx" ON "public"."hr_alerts" USING "btree" ("employee_id");



CREATE INDEX "hr_alerts_status_idx" ON "public"."hr_alerts" USING "btree" ("status");



CREATE INDEX "hr_alerts_trigger_date_idx" ON "public"."hr_alerts" USING "btree" ("trigger_date");



CREATE INDEX "hr_announcements_status_idx" ON "public"."hr_announcements" USING "btree" ("status");



CREATE INDEX "hr_attendance_corrections_employee_created_idx" ON "public"."hr_attendance_corrections" USING "btree" ("employee_id", "created_at" DESC);



CREATE INDEX "hr_attendance_corrections_work_date_idx" ON "public"."hr_attendance_corrections" USING "btree" ("employee_id", "work_date");



CREATE INDEX "hr_attendance_employee_id_check_in_at_idx" ON "public"."hr_attendance" USING "btree" ("employee_id", "check_in_at");



CREATE INDEX "hr_attendance_location_review_status_idx" ON "public"."hr_attendance" USING "btree" ("location_review_status", "check_in_at" DESC);



CREATE INDEX "hr_attendance_shift_date_idx" ON "public"."hr_attendance" USING "btree" ("shift_date");



CREATE INDEX "hr_attendance_submissions_employee_idx" ON "public"."hr_attendance_submissions" USING "btree" ("employee_id");



CREATE INDEX "hr_attendance_submissions_status_idx" ON "public"."hr_attendance_submissions" USING "btree" ("approval_status");



CREATE INDEX "hr_attendance_work_shift_id_idx" ON "public"."hr_attendance" USING "btree" ("work_shift_id");



CREATE INDEX "hr_complaint_replies_complaint_id_idx" ON "public"."hr_complaint_replies" USING "btree" ("complaint_id");



CREATE INDEX "hr_complaints_status_idx" ON "public"."hr_complaints" USING "btree" ("status");



CREATE INDEX "hr_complaints_ticket_code_idx" ON "public"."hr_complaints" USING "btree" ("ticket_code");



CREATE INDEX "hr_compliance_notes_employee_id_idx" ON "public"."hr_compliance_notes" USING "btree" ("employee_id");



CREATE INDEX "hr_departments_branch_id_idx" ON "public"."hr_departments" USING "btree" ("branch_id");



CREATE UNIQUE INDEX "hr_departments_branch_name_uidx" ON "public"."hr_departments" USING "btree" ("branch_id", "name") WHERE ("branch_id" IS NOT NULL);



CREATE INDEX "hr_document_requests_employee_id_idx" ON "public"."hr_document_requests" USING "btree" ("employee_id");



CREATE INDEX "hr_document_requests_status_idx" ON "public"."hr_document_requests" USING "btree" ("status");



CREATE INDEX "hr_employees_branch_id_idx" ON "public"."hr_employees" USING "btree" ("branch_id");



CREATE UNIQUE INDEX "hr_employees_employee_code_unique" ON "public"."hr_employees" USING "btree" ("lower"(TRIM(BOTH FROM "employee_code"))) WHERE (("employee_code" IS NOT NULL) AND (TRIM(BOTH FROM "employee_code") <> ''::"text"));



CREATE INDEX "hr_employees_status_idx" ON "public"."hr_employees" USING "btree" ("status");



CREATE INDEX "hr_employees_work_shift_id_idx" ON "public"."hr_employees" USING "btree" ("work_shift_id");



CREATE INDEX "hr_leaves_employee_id_idx" ON "public"."hr_leaves" USING "btree" ("employee_id");



CREATE INDEX "hr_leaves_status_idx" ON "public"."hr_leaves" USING "btree" ("status");



CREATE INDEX "hr_line_pending_actions_expires_at_idx" ON "public"."hr_line_pending_actions" USING "btree" ("expires_at");



CREATE UNIQUE INDEX "hr_line_pending_actions_one_per_user_idx" ON "public"."hr_line_pending_actions" USING "btree" ("line_user_id");



CREATE INDEX "hr_overtime_requests_employee_id_idx" ON "public"."hr_overtime_requests" USING "btree" ("employee_id");



CREATE INDEX "hr_overtime_requests_status_idx" ON "public"."hr_overtime_requests" USING "btree" ("status");



CREATE INDEX "hr_payroll_hour_lines_period_idx" ON "public"."hr_payroll_hour_lines" USING "btree" ("period_id");



CREATE INDEX "hr_payroll_runs_period_idx" ON "public"."hr_payroll_runs" USING "btree" ("period");



CREATE INDEX "hr_payroll_runs_status_idx" ON "public"."hr_payroll_runs" USING "btree" ("status");



CREATE INDEX "hr_payslip_lines_payslip_idx" ON "public"."hr_payslip_lines" USING "btree" ("payslip_id");



CREATE INDEX "hr_payslips_employee_idx" ON "public"."hr_payslips" USING "btree" ("employee_id");



CREATE INDEX "hr_payslips_run_idx" ON "public"."hr_payslips" USING "btree" ("run_id");



CREATE INDEX "hr_positions_branch_id_idx" ON "public"."hr_positions" USING "btree" ("branch_id");



CREATE UNIQUE INDEX "hr_positions_department_name_uidx" ON "public"."hr_positions" USING "btree" ("department_id", "name") WHERE ("department_id" IS NOT NULL);



CREATE INDEX "inv_branches_hr_branch_id_idx" ON "public"."inv_branches" USING "btree" ("hr_branch_id");



CREATE UNIQUE INDEX "inv_branches_hr_branch_id_unique" ON "public"."inv_branches" USING "btree" ("hr_branch_id") WHERE ("hr_branch_id" IS NOT NULL);



CREATE INDEX "inv_consumptions_branch_recorded_idx" ON "public"."inv_consumptions" USING "btree" ("branch_id", "recorded_at" DESC);



CREATE INDEX "inv_consumptions_recorded_created_idx" ON "public"."inv_consumptions" USING "btree" ("recorded_by", "recorded_at" DESC);



CREATE INDEX "inv_consumptions_sku_recorded_idx" ON "public"."inv_consumptions" USING "btree" ("sku_id", "recorded_at" DESC);



CREATE INDEX "inv_consumptions_type_recorded_idx" ON "public"."inv_consumptions" USING "btree" ("consumption_type", "recorded_at" DESC);



CREATE INDEX "inv_consumptions_warehouse_recorded_idx" ON "public"."inv_consumptions" USING "btree" ("warehouse_id", "recorded_at" DESC);



CREATE INDEX "inv_damages_approval_role_idx" ON "public"."inv_damages" USING "btree" ("approval_required_role", "status");



CREATE INDEX "inv_damages_branch_status_idx" ON "public"."inv_damages" USING "btree" ("branch_id", "status");



CREATE INDEX "inv_damages_created_by_idx" ON "public"."inv_damages" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "inv_damages_sku_created_idx" ON "public"."inv_damages" USING "btree" ("sku_id", "created_at" DESC);



CREATE INDEX "inv_damages_status_created_idx" ON "public"."inv_damages" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "inv_damages_warehouse_status_idx" ON "public"."inv_damages" USING "btree" ("warehouse_id", "status");



CREATE INDEX "inv_requisition_issue_lines_item_idx" ON "public"."inv_requisition_issue_lines" USING "btree" ("requisition_item_id");



CREATE INDEX "inv_requisition_items_lot_idx" ON "public"."inv_requisition_items" USING "btree" ("lot_number");



CREATE INDEX "inv_requisition_items_requisition_idx" ON "public"."inv_requisition_items" USING "btree" ("requisition_id");



CREATE INDEX "inv_requisition_items_sku_idx" ON "public"."inv_requisition_items" USING "btree" ("sku_id");



CREATE INDEX "inv_requisitions_branch_status_idx" ON "public"."inv_requisitions" USING "btree" ("branch_id", "status");



CREATE INDEX "inv_requisitions_requester_created_idx" ON "public"."inv_requisitions" USING "btree" ("requester_id", "created_at" DESC);



CREATE INDEX "inv_requisitions_status_created_idx" ON "public"."inv_requisitions" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "inv_requisitions_warehouse_status_idx" ON "public"."inv_requisitions" USING "btree" ("warehouse_id", "status");



CREATE INDEX "inv_stock_adjustments_count_idx" ON "public"."inv_stock_adjustments" USING "btree" ("count_id");



CREATE INDEX "inv_stock_adjustments_sku_idx" ON "public"."inv_stock_adjustments" USING "btree" ("sku_id");



CREATE INDEX "inv_stock_adjustments_warehouse_status_idx" ON "public"."inv_stock_adjustments" USING "btree" ("warehouse_id", "status");



CREATE INDEX "inv_stock_count_items_count_idx" ON "public"."inv_stock_count_items" USING "btree" ("count_id");



CREATE UNIQUE INDEX "inv_stock_count_items_count_sku_lot_unique" ON "public"."inv_stock_count_items" USING "btree" ("count_id", "sku_id", COALESCE(("lot_id")::"text", "lot_number", ''::"text"));



CREATE INDEX "inv_stock_count_items_sku_idx" ON "public"."inv_stock_count_items" USING "btree" ("sku_id");



CREATE INDEX "inv_stock_counts_branch_status_idx" ON "public"."inv_stock_counts" USING "btree" ("branch_id", "status");



CREATE INDEX "inv_stock_counts_status_created_idx" ON "public"."inv_stock_counts" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "inv_stock_counts_warehouse_status_idx" ON "public"."inv_stock_counts" USING "btree" ("warehouse_id", "status");



CREATE INDEX "inv_stock_lots_expiry_idx" ON "public"."inv_stock_lots" USING "btree" ("expiry_date") WHERE (("remaining_qty" > (0)::numeric) AND ("status" = 'available'::"text"));



CREATE INDEX "inv_stock_lots_fefo_idx" ON "public"."inv_stock_lots" USING "btree" ("sku_id", "warehouse_id", "status", "expiry_date", "received_date", "id");



CREATE INDEX "inv_stock_movements_lot_idx" ON "public"."inv_stock_movements" USING "btree" ("lot_id") WHERE ("lot_id" IS NOT NULL);



CREATE INDEX "inv_stock_movements_reference_idx" ON "public"."inv_stock_movements" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "inv_stock_movements_sku_created_idx" ON "public"."inv_stock_movements" USING "btree" ("sku_id", "created_at" DESC);



CREATE INDEX "inv_stock_movements_warehouse_created_idx" ON "public"."inv_stock_movements" USING "btree" ("warehouse_id", "created_at" DESC);



CREATE INDEX "inv_transfer_items_sku_idx" ON "public"."inv_transfer_items" USING "btree" ("sku_id");



CREATE INDEX "inv_transfer_items_transfer_idx" ON "public"."inv_transfer_items" USING "btree" ("transfer_id");



CREATE INDEX "inv_transfers_from_branch_status_idx" ON "public"."inv_transfers" USING "btree" ("from_branch_id", "status");



CREATE INDEX "inv_transfers_status_created_idx" ON "public"."inv_transfers" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "inv_transfers_to_branch_status_idx" ON "public"."inv_transfers" USING "btree" ("to_branch_id", "status");



CREATE OR REPLACE TRIGGER "hr_branches_set_updated_at" BEFORE UPDATE ON "public"."hr_branches" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_complaints_updated_at" BEFORE UPDATE ON "public"."hr_complaints" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_document_requests_updated_at" BEFORE UPDATE ON "public"."hr_document_requests" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_employees_set_updated_at" BEFORE UPDATE ON "public"."hr_employees" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_leave_balances_set_updated_at" BEFORE UPDATE ON "public"."hr_leave_balances" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_leave_policy_defaults_set_updated_at" BEFORE UPDATE ON "public"."hr_leave_policy_defaults" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_leaves_set_updated_at" BEFORE UPDATE ON "public"."hr_leaves" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_overtime_requests_updated_at" BEFORE UPDATE ON "public"."hr_overtime_requests" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_payroll_config_updated_at" BEFORE UPDATE ON "public"."hr_payroll_config" FOR EACH ROW EXECUTE FUNCTION "public"."hr_payroll_config_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_payroll_runs_updated_at" BEFORE UPDATE ON "public"."hr_payroll_runs" FOR EACH ROW EXECUTE FUNCTION "public"."hr_payroll_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_payslips_updated_at" BEFORE UPDATE ON "public"."hr_payslips" FOR EACH ROW EXECUTE FUNCTION "public"."hr_payroll_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_runtime_config_updated_at" BEFORE UPDATE ON "public"."hr_runtime_config" FOR EACH ROW EXECUTE FUNCTION "public"."hr_runtime_config_set_updated_at"();



CREATE OR REPLACE TRIGGER "hr_work_shifts_set_updated_at" BEFORE UPDATE ON "public"."hr_work_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_branches_set_updated_at" BEFORE UPDATE ON "public"."inv_branches" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_damages_set_updated_at" BEFORE UPDATE ON "public"."inv_damages" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_inbound_orders_set_updated_at" BEFORE UPDATE ON "public"."inv_inbound_orders" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_requisition_items_set_updated_at" BEFORE UPDATE ON "public"."inv_requisition_items" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_requisitions_set_updated_at" BEFORE UPDATE ON "public"."inv_requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_skus_set_updated_at" BEFORE UPDATE ON "public"."inv_skus" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_stock_adjustments_set_updated_at" BEFORE UPDATE ON "public"."inv_stock_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_stock_balances_set_updated_at" BEFORE UPDATE ON "public"."inv_stock_balances" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_stock_count_items_set_updated_at" BEFORE UPDATE ON "public"."inv_stock_count_items" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_stock_counts_set_updated_at" BEFORE UPDATE ON "public"."inv_stock_counts" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_stock_lots_set_updated_at" BEFORE UPDATE ON "public"."inv_stock_lots" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_suppliers_set_updated_at" BEFORE UPDATE ON "public"."inv_suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_transfer_items_set_updated_at" BEFORE UPDATE ON "public"."inv_transfer_items" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_transfers_set_updated_at" BEFORE UPDATE ON "public"."inv_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



CREATE OR REPLACE TRIGGER "inv_warehouses_set_updated_at" BEFORE UPDATE ON "public"."inv_warehouses" FOR EACH ROW EXECUTE FUNCTION "public"."hr_set_updated_at"();



ALTER TABLE ONLY "public"."hr_alerts"
    ADD CONSTRAINT "hr_alerts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_announcements"
    ADD CONSTRAINT "hr_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance_corrections"
    ADD CONSTRAINT "hr_attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."hr_attendance"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance_corrections"
    ADD CONSTRAINT "hr_attendance_corrections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance_corrections"
    ADD CONSTRAINT "hr_attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_location_reviewed_by_fkey" FOREIGN KEY ("location_reviewed_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."hr_attendance"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_hr_decided_by_fkey" FOREIGN KEY ("hr_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance_submissions"
    ADD CONSTRAINT "hr_attendance_submissions_manager_decided_by_fkey" FOREIGN KEY ("manager_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_work_shift_id_fkey" FOREIGN KEY ("work_shift_id") REFERENCES "public"."hr_work_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_branches"
    ADD CONSTRAINT "hr_branches_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_complaint_replies"
    ADD CONSTRAINT "hr_complaint_replies_author_employee_id_fkey" FOREIGN KEY ("author_employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_complaint_replies"
    ADD CONSTRAINT "hr_complaint_replies_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "public"."hr_complaints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_complaints"
    ADD CONSTRAINT "hr_complaints_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_compliance_notes"
    ADD CONSTRAINT "hr_compliance_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_compliance_notes"
    ADD CONSTRAINT "hr_compliance_notes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_departments"
    ADD CONSTRAINT "hr_departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."hr_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."hr_document_requests"
    ADD CONSTRAINT "hr_document_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."hr_branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."hr_departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_employees"
    ADD CONSTRAINT "hr_employees_work_shift_id_fkey" FOREIGN KEY ("work_shift_id") REFERENCES "public"."hr_work_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_hr_decided_by_fkey" FOREIGN KEY ("hr_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_leaves"
    ADD CONSTRAINT "hr_leaves_manager_decided_by_fkey" FOREIGN KEY ("manager_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_line_pending_actions"
    ADD CONSTRAINT "hr_line_pending_actions_approver_employee_id_fkey" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_hr_decided_by_fkey" FOREIGN KEY ("hr_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_manager_decided_by_fkey" FOREIGN KEY ("manager_decided_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_overtime_requests"
    ADD CONSTRAINT "hr_overtime_requests_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_payroll_hour_lines"
    ADD CONSTRAINT "hr_payroll_hour_lines_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."hr_payroll_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_payroll_periods"
    ADD CONSTRAINT "hr_payroll_periods_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."hr_branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_payroll_runs"
    ADD CONSTRAINT "hr_payroll_runs_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_payslip_lines"
    ADD CONSTRAINT "hr_payslip_lines_payslip_id_fkey" FOREIGN KEY ("payslip_id") REFERENCES "public"."hr_payslips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_payslips"
    ADD CONSTRAINT "hr_payslips_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."hr_payroll_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_positions"
    ADD CONSTRAINT "hr_positions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."hr_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."hr_positions"
    ADD CONSTRAINT "hr_positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."hr_departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_boms"
    ADD CONSTRAINT "inv_boms_ingredient_sku_id_fkey" FOREIGN KEY ("ingredient_sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_boms"
    ADD CONSTRAINT "inv_boms_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_boms"
    ADD CONSTRAINT "inv_boms_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inv_units"("id");



ALTER TABLE ONLY "public"."inv_branches"
    ADD CONSTRAINT "inv_branches_hr_branch_id_fkey" FOREIGN KEY ("hr_branch_id") REFERENCES "public"."hr_branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_consumptions"
    ADD CONSTRAINT "inv_consumptions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_damages"
    ADD CONSTRAINT "inv_damages_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_inbound_order_id_fkey" FOREIGN KEY ("inbound_order_id") REFERENCES "public"."inv_inbound_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_inbound_items"
    ADD CONSTRAINT "inv_inbound_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."inv_suppliers"("id");



ALTER TABLE ONLY "public"."inv_inbound_orders"
    ADD CONSTRAINT "inv_inbound_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id");



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisition_issue_lines"
    ADD CONSTRAINT "inv_requisition_issue_lines_requisition_item_id_fkey" FOREIGN KEY ("requisition_item_id") REFERENCES "public"."inv_requisition_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."inv_requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_requisition_items"
    ADD CONSTRAINT "inv_requisition_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_requisitions"
    ADD CONSTRAINT "inv_requisitions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_skus"
    ADD CONSTRAINT "inv_skus_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."inv_units"("id");



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."inv_stock_counts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_adjustments"
    ADD CONSTRAINT "inv_stock_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_balances"
    ADD CONSTRAINT "inv_stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "public"."inv_stock_counts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_count_items"
    ADD CONSTRAINT "inv_stock_count_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_counts"
    ADD CONSTRAINT "inv_stock_counts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_inbound_item_id_fkey" FOREIGN KEY ("inbound_item_id") REFERENCES "public"."inv_inbound_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_lots"
    ADD CONSTRAINT "inv_stock_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_stock_movements"
    ADD CONSTRAINT "inv_stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "public"."inv_skus"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_source_lot_id_fkey" FOREIGN KEY ("source_lot_id") REFERENCES "public"."inv_stock_lots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfer_items"
    ADD CONSTRAINT "inv_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."inv_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."hr_employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."hr_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_transfers"
    ADD CONSTRAINT "inv_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."inv_warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_from_unit_id_fkey" FOREIGN KEY ("from_unit_id") REFERENCES "public"."inv_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_unit_conversions"
    ADD CONSTRAINT "inv_unit_conversions_to_unit_id_fkey" FOREIGN KEY ("to_unit_id") REFERENCES "public"."inv_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inv_warehouses"
    ADD CONSTRAINT "inv_warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."inv_branches"("id") ON DELETE CASCADE;



CREATE POLICY "alerts delete hr only" ON "public"."hr_alerts" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts insert hr only" ON "public"."hr_alerts" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts select hr only" ON "public"."hr_alerts" FOR SELECT TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "alerts update hr only" ON "public"."hr_alerts" FOR UPDATE TO "authenticated" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "attendance delete hr only" ON "public"."hr_attendance" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "attendance insert self or hr" ON "public"."hr_attendance" FOR INSERT TO "authenticated" WITH CHECK ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "attendance select self or hr" ON "public"."hr_attendance" FOR SELECT TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"()));



CREATE POLICY "attendance update self or hr" ON "public"."hr_attendance" FOR UPDATE TO "authenticated" USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"())) WITH CHECK ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "employees delete hr only" ON "public"."hr_employees" FOR DELETE TO "authenticated" USING ("public"."hr_is_hr_admin"());



CREATE POLICY "employees insert hr only" ON "public"."hr_employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "employees select self or hr" ON "public"."hr_employees" FOR SELECT TO "authenticated" USING ((("id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"()));



CREATE POLICY "employees update hr or ceo" ON "public"."hr_employees" FOR UPDATE TO "authenticated" USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"())) WITH CHECK (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"()));



ALTER TABLE "public"."hr_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_announcements_delete" ON "public"."hr_announcements" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_announcements_insert" ON "public"."hr_announcements" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_announcements_select" ON "public"."hr_announcements" FOR SELECT USING (("public"."hr_can_read_company"() OR ("status" = 'sent'::"text")));



CREATE POLICY "hr_announcements_update" ON "public"."hr_announcements" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_att_sub_insert" ON "public"."hr_attendance_submissions" FOR INSERT WITH CHECK (("employee_id" = "public"."hr_employee_id"()));



CREATE POLICY "hr_att_sub_select" ON "public"."hr_attendance_submissions" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



CREATE POLICY "hr_att_sub_update" ON "public"."hr_attendance_submissions" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_attendance_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_attendance_corrections_hr_all" ON "public"."hr_attendance_corrections" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_employees" "e"
  WHERE (("e"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")) AND ("e"."role" = ANY (ARRAY['hr'::"text", 'ceo'::"text", 'dev'::"text", 'inventory'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."hr_employees" "e"
  WHERE (("e"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")) AND ("e"."role" = ANY (ARRAY['hr'::"text", 'ceo'::"text", 'dev'::"text", 'inventory'::"text"]))))));



CREATE POLICY "hr_attendance_corrections_self_select" ON "public"."hr_attendance_corrections" FOR SELECT TO "authenticated" USING (("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."line_user_id" = ("auth"."jwt"() ->> 'line_user_id'::"text")))));



ALTER TABLE "public"."hr_attendance_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_branches_select" ON "public"."hr_branches" FOR SELECT USING (("public"."hr_can_read_company"() OR "public"."hr_is_branch_manager"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "hr_branches_write" ON "public"."hr_branches" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_complaint_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_complaint_replies_delete" ON "public"."hr_complaint_replies" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_complaint_replies_insert" ON "public"."hr_complaint_replies" FOR INSERT WITH CHECK (("public"."hr_is_hr_admin"() AND ("author_employee_id" = "public"."hr_employee_id"())));



CREATE POLICY "hr_complaint_replies_select" ON "public"."hr_complaint_replies" FOR SELECT USING (("public"."hr_is_hr_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hr_complaints" "c"
  WHERE (("c"."id" = "hr_complaint_replies"."complaint_id") AND (NOT "c"."is_anonymous") AND ("c"."employee_id" = "public"."hr_employee_id"()))))));



ALTER TABLE "public"."hr_complaints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_complaints_insert" ON "public"."hr_complaints" FOR INSERT WITH CHECK ((("public"."hr_employee_id"() IS NOT NULL) AND (((NOT "is_anonymous") AND ("employee_id" = "public"."hr_employee_id"())) OR ("is_anonymous" AND ("employee_id" IS NULL)))));



CREATE POLICY "hr_complaints_select" ON "public"."hr_complaints" FOR SELECT USING (("public"."hr_is_hr_admin"() OR ((NOT "is_anonymous") AND ("employee_id" = "public"."hr_employee_id"()))));



CREATE POLICY "hr_complaints_update" ON "public"."hr_complaints" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_compliance_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_compliance_notes_delete" ON "public"."hr_compliance_notes" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_compliance_notes_insert" ON "public"."hr_compliance_notes" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_compliance_notes_select" ON "public"."hr_compliance_notes" FOR SELECT USING ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_departments_delete" ON "public"."hr_departments" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_departments_insert" ON "public"."hr_departments" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_departments_select" ON "public"."hr_departments" FOR SELECT USING (("public"."hr_can_read_company"() OR ("public"."hr_employee_id"() IS NOT NULL) OR "public"."hr_is_branch_manager"()));



CREATE POLICY "hr_departments_update" ON "public"."hr_departments" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_document_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_document_requests_delete" ON "public"."hr_document_requests" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_document_requests_insert" ON "public"."hr_document_requests" FOR INSERT WITH CHECK (("employee_id" = "public"."hr_employee_id"()));



CREATE POLICY "hr_document_requests_select" ON "public"."hr_document_requests" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "hr_document_requests_update" ON "public"."hr_document_requests" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_policy_defaults" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leaves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_leaves_update" ON "public"."hr_leaves" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("approval_status" = 'pending_manager'::"text") AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_line_pending_actions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_overtime_insert" ON "public"."hr_overtime_requests" FOR INSERT WITH CHECK (("public"."hr_is_hr_admin"() OR ("employee_id" = "public"."hr_employee_id"()) OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



ALTER TABLE "public"."hr_overtime_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_overtime_select" ON "public"."hr_overtime_requests" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_can_read_company"() OR ("public"."hr_is_branch_manager"() AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"()))))));



CREATE POLICY "hr_overtime_update" ON "public"."hr_overtime_requests" FOR UPDATE USING (("public"."hr_is_hr_admin"() OR ("public"."hr_is_branch_manager"() AND ("approval_status" = 'pending_manager'::"text") AND ("employee_id" IN ( SELECT "hr_employees"."id"
   FROM "public"."hr_employees"
  WHERE ("hr_employees"."branch_id" = "public"."hr_managed_branch_id"())))))) WITH CHECK (true);



ALTER TABLE "public"."hr_payroll_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_config_select" ON "public"."hr_payroll_config" FOR SELECT USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_payroll_config_upsert" ON "public"."hr_payroll_config" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_hour_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_lines_select" ON "public"."hr_payroll_hour_lines" FOR SELECT USING ("public"."hr_can_read_company"());



CREATE POLICY "hr_payroll_lines_write" ON "public"."hr_payroll_hour_lines" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_periods_select" ON "public"."hr_payroll_periods" FOR SELECT USING ("public"."hr_can_read_company"());



CREATE POLICY "hr_payroll_periods_write" ON "public"."hr_payroll_periods" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payroll_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payroll_runs_hr" ON "public"."hr_payroll_runs" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payslip_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payslip_lines_select" ON "public"."hr_payslip_lines" FOR SELECT USING (("public"."hr_is_hr_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."hr_payslips" "p"
  WHERE (("p"."id" = "hr_payslip_lines"."payslip_id") AND ("p"."employee_id" = "public"."hr_employee_id"()))))));



CREATE POLICY "hr_payslip_lines_write" ON "public"."hr_payslip_lines" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_payslips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_payslips_select" ON "public"."hr_payslips" FOR SELECT USING ((("employee_id" = "public"."hr_employee_id"()) OR "public"."hr_is_hr_admin"()));



CREATE POLICY "hr_payslips_write" ON "public"."hr_payslips" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_positions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_positions_delete" ON "public"."hr_positions" FOR DELETE USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_positions_insert" ON "public"."hr_positions" FOR INSERT WITH CHECK ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_positions_select" ON "public"."hr_positions" FOR SELECT USING (("public"."hr_is_hr_admin"() OR ("public"."hr_employee_id"() IS NOT NULL) OR "public"."hr_is_branch_manager"()));



CREATE POLICY "hr_positions_update" ON "public"."hr_positions" FOR UPDATE USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_runtime_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_runtime_config_select" ON "public"."hr_runtime_config" FOR SELECT USING ("public"."hr_is_hr_admin"());



CREATE POLICY "hr_runtime_config_upsert" ON "public"."hr_runtime_config" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."hr_work_shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hr_work_shifts_select" ON "public"."hr_work_shifts" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "hr_work_shifts_write" ON "public"."hr_work_shifts" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_boms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inv_boms_select" ON "public"."inv_boms" FOR SELECT USING (("public"."hr_is_hr_admin"() OR "public"."hr_is_ceo"() OR ("public"."hr_employee_id"() IS NOT NULL)));



CREATE POLICY "inv_boms_write" ON "public"."inv_boms" USING ("public"."hr_is_hr_admin"()) WITH CHECK ("public"."hr_is_hr_admin"());



ALTER TABLE "public"."inv_branches" ENABLE ROW LEVEL SECURITY;


