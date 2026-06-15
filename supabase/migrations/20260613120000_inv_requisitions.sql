-- T138: Kitchen requisition workflow

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
      and e.role in ('hr', 'admin', 'dev', 'ceo')
  )
$$;

revoke execute on function public.inv_can_manage_requisitions() from public, anon;
grant execute on function public.inv_can_manage_requisitions() to authenticated, service_role;

create table if not exists public.inv_requisitions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  requester_id uuid not null references public.hr_employees (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'issued', 'completed', 'rejected')),
  notes text,
  rejection_reason text,
  approved_by uuid references public.hr_employees (id) on delete set null,
  approved_at timestamptz,
  issued_by uuid references public.hr_employees (id) on delete set null,
  issued_at timestamptz,
  received_by uuid references public.hr_employees (id) on delete set null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_requisition_items (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.inv_requisitions (id) on delete cascade,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty_requested numeric not null check (qty_requested > 0),
  qty_approved numeric not null default 0 check (qty_approved >= 0),
  qty_issued numeric not null default 0 check (qty_issued >= 0),
  qty_received numeric not null default 0 check (qty_received >= 0),
  lot_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_req_items_qty_approved_lte_requested
    check (qty_approved <= qty_requested),
  constraint inv_req_items_qty_issued_lte_approved
    check (qty_issued <= qty_approved),
  constraint inv_req_items_qty_received_lte_issued
    check (qty_received <= qty_issued)
);

create table if not exists public.inv_stock_movements (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  movement_type text not null,
  quantity numeric not null,
  reference_type text,
  reference_id uuid,
  lot_number text,
  created_by uuid references public.hr_employees (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint inv_stock_movements_quantity_nonzero check (quantity <> 0)
);

create index if not exists inv_requisitions_requester_created_idx
  on public.inv_requisitions (requester_id, created_at desc);
create index if not exists inv_requisitions_status_created_idx
  on public.inv_requisitions (status, created_at desc);
create index if not exists inv_requisitions_branch_status_idx
  on public.inv_requisitions (branch_id, status);
create index if not exists inv_requisitions_warehouse_status_idx
  on public.inv_requisitions (warehouse_id, status);
create index if not exists inv_requisition_items_requisition_idx
  on public.inv_requisition_items (requisition_id);
create index if not exists inv_requisition_items_sku_idx
  on public.inv_requisition_items (sku_id);
create index if not exists inv_requisition_items_lot_idx
  on public.inv_requisition_items (lot_number);
create index if not exists inv_stock_movements_sku_created_idx
  on public.inv_stock_movements (sku_id, created_at desc);
create index if not exists inv_stock_movements_warehouse_created_idx
  on public.inv_stock_movements (warehouse_id, created_at desc);
create index if not exists inv_stock_movements_reference_idx
  on public.inv_stock_movements (reference_type, reference_id);

drop trigger if exists inv_requisitions_set_updated_at on public.inv_requisitions;
create trigger inv_requisitions_set_updated_at
  before update on public.inv_requisitions
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_requisition_items_set_updated_at on public.inv_requisition_items;
create trigger inv_requisition_items_set_updated_at
  before update on public.inv_requisition_items
  for each row execute function public.hr_set_updated_at();

alter table public.inv_requisitions enable row level security;
alter table public.inv_requisition_items enable row level security;
alter table public.inv_stock_movements enable row level security;

drop policy if exists inv_requisitions_select on public.inv_requisitions;
create policy inv_requisitions_select on public.inv_requisitions
  for select using (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  );

drop policy if exists inv_requisitions_insert on public.inv_requisitions;
create policy inv_requisitions_insert on public.inv_requisitions
  for insert with check (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  );

drop policy if exists inv_requisitions_update on public.inv_requisitions;
create policy inv_requisitions_update on public.inv_requisitions
  for update using (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
  )
  with check (
    requester_id = public.hr_employee_id()
    or public.inv_can_manage_requisitions()
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
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_requisition_items_insert on public.inv_requisition_items;
create policy inv_requisition_items_insert on public.inv_requisition_items
  for insert with check (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_requisition_items_update on public.inv_requisition_items;
create policy inv_requisition_items_update on public.inv_requisition_items
  for update using (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.inv_requisitions r
      where r.id = requisition_id
        and (
          r.requester_id = public.hr_employee_id()
          or public.inv_can_manage_requisitions()
        )
    )
  );

drop policy if exists inv_stock_movements_select on public.inv_stock_movements;
create policy inv_stock_movements_select on public.inv_stock_movements
  for select using (
    public.inv_can_manage_requisitions()
    or public.hr_employee_id() is not null
  );

drop policy if exists inv_stock_movements_insert on public.inv_stock_movements;
create policy inv_stock_movements_insert on public.inv_stock_movements
  for insert with check (public.inv_can_manage_requisitions());

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
    v_stock_qty := null;

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

    if v_item_id <> v_req_item.id then
      raise exception 'invalid issued item';
    end if;

    if v_qty_issued <= 0 or v_qty_issued > v_req_item.qty_approved then
      raise exception 'issued quantity exceeds approved quantity';
    end if;

    if v_lot_number is null then
      raise exception 'lot number required';
    end if;

    select quantity into v_stock_qty
    from public.inv_stock_balances
    where sku_id = v_req_item.sku_id
      and warehouse_id = v_requisition.warehouse_id
    for update;

    if coalesce(v_stock_qty, 0) < v_qty_issued then
      raise exception 'insufficient stock';
    end if;

    update public.inv_stock_balances
    set quantity = quantity - v_qty_issued,
        updated_at = now()
    where sku_id = v_req_item.sku_id
      and warehouse_id = v_requisition.warehouse_id;

    update public.inv_requisition_items
    set qty_issued = v_qty_issued,
        lot_number = v_lot_number
    where id = v_req_item.id;

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
      v_req_item.sku_id,
      v_requisition.warehouse_id,
      'requisition_issue',
      -v_qty_issued,
      'requisition',
      p_requisition_id,
      v_lot_number,
      v_actor_id,
      'Kitchen requisition issue'
    );
  end loop;

  update public.inv_requisitions
  set status = 'issued',
      issued_by = v_actor_id,
      issued_at = now()
  where id = p_requisition_id;
end;
$$;

revoke all on function public.inv_issue_requisition(uuid, jsonb) from public;
grant execute on function public.inv_issue_requisition(uuid, jsonb) to authenticated;
