-- FEFO-001–FEFO-014: Lot inventory + FEFO allocation foundation

-- ---------------------------------------------------------------------------
-- FEFO-001: inv_stock_lots + movement columns
-- ---------------------------------------------------------------------------

create table if not exists public.inv_stock_lots (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  lot_number text not null,
  batch_number text,
  supplier_lot_ref text,
  expiry_date date,
  manufactured_date date,
  received_date date not null default current_date,
  received_qty numeric not null check (received_qty > 0),
  remaining_qty numeric not null check (remaining_qty >= 0),
  unit_cost numeric,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'expired', 'damaged', 'depleted')),
  inbound_item_id uuid references public.inv_inbound_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_stock_lots_remaining_lte_received check (remaining_qty <= received_qty),
  constraint inv_stock_lots_warehouse_sku_lot_unique unique (warehouse_id, sku_id, lot_number)
);

create index if not exists inv_stock_lots_fefo_idx
  on public.inv_stock_lots (sku_id, warehouse_id, status, expiry_date nulls last, received_date, id);

create index if not exists inv_stock_lots_expiry_idx
  on public.inv_stock_lots (expiry_date)
  where remaining_qty > 0 and status = 'available';

create trigger inv_stock_lots_set_updated_at
  before update on public.inv_stock_lots
  for each row execute function public.hr_set_updated_at();

alter table public.inv_stock_movements
  add column if not exists lot_id uuid references public.inv_stock_lots (id) on delete set null,
  add column if not exists qty_before numeric,
  add column if not exists qty_after numeric;

create index if not exists inv_stock_movements_lot_idx
  on public.inv_stock_movements (lot_id)
  where lot_id is not null;

-- ---------------------------------------------------------------------------
-- FEFO-002: SKU flags
-- ---------------------------------------------------------------------------

alter table public.inv_skus
  add column if not exists expiry_required boolean not null default false,
  add column if not exists lot_tracking_required boolean not null default true,
  add column if not exists default_issue_method text not null default 'fefo'
    check (default_issue_method in ('fefo', 'fifo', 'manual')),
  add column if not exists shelf_life_days integer
    check (shelf_life_days is null or shelf_life_days > 0),
  add column if not exists storage_type text
    check (storage_type is null or storage_type in ('dry', 'chilled', 'frozen'));

-- ---------------------------------------------------------------------------
-- FEFO-005 / FEFO-014: Issue lines + override audit
-- ---------------------------------------------------------------------------

create table if not exists public.inv_requisition_issue_lines (
  id uuid primary key default gen_random_uuid(),
  requisition_item_id uuid not null references public.inv_requisition_items (id) on delete cascade,
  lot_id uuid not null references public.inv_stock_lots (id) on delete restrict,
  qty_issued numeric not null check (qty_issued > 0),
  override_reason text,
  overridden_by uuid references public.hr_employees (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inv_requisition_issue_lines_item_idx
  on public.inv_requisition_issue_lines (requisition_item_id);

-- FEFO-010: lot on damage
alter table public.inv_damages
  add column if not exists lot_id uuid references public.inv_stock_lots (id) on delete set null;

-- FEFO-009 / FEFO-011: lot_id on transfer + count items
alter table public.inv_transfer_items
  add column if not exists lot_id uuid references public.inv_stock_lots (id) on delete set null,
  add column if not exists source_lot_id uuid references public.inv_stock_lots (id) on delete set null;

alter table public.inv_stock_count_items
  add column if not exists lot_id uuid references public.inv_stock_lots (id) on delete set null;

alter table public.inv_stock_count_items
  drop constraint if exists inv_stock_count_items_count_sku_unique;

create unique index if not exists inv_stock_count_items_count_sku_lot_unique
  on public.inv_stock_count_items (count_id, sku_id, coalesce(lot_id::text, lot_number, ''));

-- Backfill legacy balance into synthetic lots (one per sku×warehouse)
insert into public.inv_stock_lots (
  sku_id,
  warehouse_id,
  lot_number,
  received_date,
  received_qty,
  remaining_qty,
  status
)
select
  b.sku_id,
  b.warehouse_id,
  'LEGACY-' || left(b.sku_id::text, 8),
  current_date,
  b.quantity,
  b.quantity,
  case when b.quantity > 0 then 'available' else 'depleted' end
from public.inv_stock_balances b
where b.quantity > 0
  and not exists (
    select 1
    from public.inv_stock_lots l
    where l.sku_id = b.sku_id
      and l.warehouse_id = b.warehouse_id
      and l.lot_number = 'LEGACY-' || left(b.sku_id::text, 8)
  );

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.inv_stock_lots enable row level security;
alter table public.inv_requisition_issue_lines enable row level security;

drop policy if exists inv_stock_lots_select on public.inv_stock_lots;
create policy inv_stock_lots_select on public.inv_stock_lots
  for select using (public.inv_can_manage_requisitions() or public.inv_is_active_employee());

drop policy if exists inv_stock_lots_mutate on public.inv_stock_lots;
create policy inv_stock_lots_mutate on public.inv_stock_lots
  for all using (public.inv_can_manage_requisitions())
  with check (public.inv_can_manage_requisitions());

drop policy if exists inv_requisition_issue_lines_select on public.inv_requisition_issue_lines;
create policy inv_requisition_issue_lines_select on public.inv_requisition_issue_lines
  for select using (public.inv_can_manage_requisitions() or public.inv_is_active_employee());

drop policy if exists inv_requisition_issue_lines_insert on public.inv_requisition_issue_lines;
create policy inv_requisition_issue_lines_insert on public.inv_requisition_issue_lines
  for insert with check (public.inv_can_manage_requisitions());

-- ---------------------------------------------------------------------------
-- FEFO-014: override permission
-- ---------------------------------------------------------------------------

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
      and e.role in ('hr', 'admin', 'dev', 'inventory')
  )
$$;

revoke all on function public.inv_can_override_fefo() from public;
grant execute on function public.inv_can_override_fefo() to authenticated;

-- ---------------------------------------------------------------------------
-- FEFO-004 / FEFO-005 / FEFO-006: FEFO allocator (read-only suggestions)
-- ---------------------------------------------------------------------------

create or replace function public.inv_allocate_fefo(
  p_sku_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_issue_method text default null
)
returns table (
  lot_id uuid,
  lot_number text,
  expiry_date date,
  received_date date,
  qty numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
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

revoke all on function public.inv_allocate_fefo(uuid, uuid, numeric, text) from public;
grant execute on function public.inv_allocate_fefo(uuid, uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Internal: apply lot deductions + movements
-- ---------------------------------------------------------------------------

create or replace function public.inv_apply_lot_deduction(
  p_sku_id uuid,
  p_warehouse_id uuid,
  p_lot_id uuid,
  p_qty numeric,
  p_movement_type text,
  p_reference_type text,
  p_reference_id uuid,
  p_created_by uuid,
  p_notes text default null,
  p_override_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.inv_apply_lot_deduction(uuid, uuid, uuid, numeric, text, text, uuid, uuid, text, text) from public;
grant execute on function public.inv_apply_lot_deduction(uuid, uuid, uuid, numeric, text, text, uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- FEFO-003: Receive → lot + movement
-- ---------------------------------------------------------------------------

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
  if not public.hr_is_hr_admin() then
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

revoke all on function public.inv_approve_inbound_order(uuid) from public;
grant execute on function public.inv_approve_inbound_order(uuid) to authenticated;
