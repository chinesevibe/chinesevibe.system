-- T140: Consumption and damage tracking

create or replace function public.inv_can_manage_damage()
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

revoke execute on function public.inv_can_manage_damage() from public, anon;
grant execute on function public.inv_can_manage_damage() to authenticated, service_role;

create or replace function public.inv_can_admin_damage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('admin', 'dev')
  )
$$;

revoke execute on function public.inv_can_admin_damage() from public, anon;
grant execute on function public.inv_can_admin_damage() to authenticated, service_role;

create or replace function public.inv_can_approve_damage()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
      and e.role in ('hr', 'admin', 'dev')
  )
$$;

revoke execute on function public.inv_can_approve_damage() from public, anon;
grant execute on function public.inv_can_approve_damage() to authenticated, service_role;

create or replace function public.inv_is_active_employee()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hr_employees e
    where e.id = public.hr_employee_id()
      and e.status = 'active'
  )
$$;

revoke execute on function public.inv_is_active_employee() from public, anon;
grant execute on function public.inv_is_active_employee() to authenticated, service_role;

create or replace function public.inv_latest_sku_cost(p_sku_id uuid)
returns numeric
language sql stable security definer
set search_path = public
as $$
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

revoke execute on function public.inv_latest_sku_cost(uuid) from public, anon;
grant execute on function public.inv_latest_sku_cost(uuid) to authenticated, service_role;

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

create table if not exists public.inv_consumptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty numeric not null check (qty > 0),
  consumption_type text not null check (consumption_type in ('production', 'sampling', 'testing')),
  recorded_by uuid not null references public.hr_employees (id) on delete restrict,
  recorded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_damages (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty numeric not null check (qty > 0),
  damage_type text not null check (damage_type in ('damaged', 'spoiled', 'expired', 'lost', 'adjustment')),
  reason text not null check (length(trim(reason)) > 0),
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  cost_value numeric not null check (cost_value >= 0),
  approval_required_role text not null default 'hr' check (approval_required_role in ('auto', 'hr', 'admin')),
  auto_approved boolean not null default false,
  approver_id uuid references public.hr_employees (id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_by uuid not null references public.hr_employees (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text,
  constraint inv_damages_approved_has_approver
    check (status <> 'approved' or (approver_id is not null and approved_at is not null)),
  constraint inv_damages_rejected_has_timestamp
    check (status <> 'rejected' or rejected_at is not null),
  constraint inv_damages_pending_has_no_decision
    check (status <> 'pending' or (approved_at is null and rejected_at is null))
);

create index if not exists inv_stock_movements_sku_created_idx
  on public.inv_stock_movements (sku_id, created_at desc);
create index if not exists inv_stock_movements_warehouse_created_idx
  on public.inv_stock_movements (warehouse_id, created_at desc);
create index if not exists inv_stock_movements_reference_idx
  on public.inv_stock_movements (reference_type, reference_id);

create index if not exists inv_consumptions_recorded_created_idx
  on public.inv_consumptions (recorded_by, recorded_at desc);
create index if not exists inv_consumptions_branch_recorded_idx
  on public.inv_consumptions (branch_id, recorded_at desc);
create index if not exists inv_consumptions_warehouse_recorded_idx
  on public.inv_consumptions (warehouse_id, recorded_at desc);
create index if not exists inv_consumptions_sku_recorded_idx
  on public.inv_consumptions (sku_id, recorded_at desc);
create index if not exists inv_consumptions_type_recorded_idx
  on public.inv_consumptions (consumption_type, recorded_at desc);

create index if not exists inv_damages_status_created_idx
  on public.inv_damages (status, created_at desc);
create index if not exists inv_damages_branch_status_idx
  on public.inv_damages (branch_id, status);
create index if not exists inv_damages_warehouse_status_idx
  on public.inv_damages (warehouse_id, status);
create index if not exists inv_damages_sku_created_idx
  on public.inv_damages (sku_id, created_at desc);
create index if not exists inv_damages_created_by_idx
  on public.inv_damages (created_by, created_at desc);
create index if not exists inv_damages_approval_role_idx
  on public.inv_damages (approval_required_role, status);

drop trigger if exists inv_damages_set_updated_at on public.inv_damages;
create trigger inv_damages_set_updated_at
  before update on public.inv_damages
  for each row execute function public.hr_set_updated_at();

alter table public.inv_consumptions enable row level security;
alter table public.inv_damages enable row level security;
alter table public.inv_stock_movements enable row level security;

drop policy if exists inv_consumptions_select on public.inv_consumptions;
create policy inv_consumptions_select on public.inv_consumptions
  for select using (
    recorded_by = public.hr_employee_id()
    or public.inv_can_manage_damage()
  );

drop policy if exists inv_consumptions_insert on public.inv_consumptions;
create policy inv_consumptions_insert on public.inv_consumptions
  for insert with check (
    recorded_by = public.hr_employee_id()
    and public.inv_is_active_employee()
  );

drop policy if exists inv_damages_select on public.inv_damages;
create policy inv_damages_select on public.inv_damages
  for select using (
    created_by = public.hr_employee_id()
    or public.inv_can_manage_damage()
  );

drop policy if exists inv_damages_insert on public.inv_damages;
create policy inv_damages_insert on public.inv_damages
  for insert with check (
    created_by = public.hr_employee_id()
    and public.inv_is_active_employee()
  );

drop policy if exists inv_damages_update on public.inv_damages;
create policy inv_damages_update on public.inv_damages
  for update using (public.inv_can_manage_damage())
  with check (public.inv_can_manage_damage());

drop policy if exists inv_stock_movements_select on public.inv_stock_movements;
create policy inv_stock_movements_select on public.inv_stock_movements
  for select using (
    public.inv_can_manage_damage()
    or public.hr_employee_id() is not null
  );

drop policy if exists inv_stock_movements_insert on public.inv_stock_movements;
create policy inv_stock_movements_insert on public.inv_stock_movements
  for insert with check (public.inv_can_manage_damage());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventory-damage-photos',
  'inventory-damage-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inventory damage photos insert own folder" on storage.objects;
create policy "inventory damage photos insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inventory-damage-photos'
    and (storage.foldername(name))[1] = public.hr_employee_id()::text
    and public.inv_is_active_employee()
  );

drop policy if exists "inventory damage photos select own or manager" on storage.objects;
create policy "inventory damage photos select own or manager"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  );

drop policy if exists "inventory damage photos update own or manager" on storage.objects;
create policy "inventory damage photos update own or manager"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  )
  with check (
    bucket_id = 'inventory-damage-photos'
    and (
      (storage.foldername(name))[1] = public.hr_employee_id()::text
      or public.inv_can_manage_damage()
    )
  );

create or replace function public.inv_validate_branch_warehouse(
  p_branch_id uuid,
  p_warehouse_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.inv_validate_branch_warehouse(uuid, uuid) from public;
grant execute on function public.inv_validate_branch_warehouse(uuid, uuid) to authenticated, service_role;

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
    if not exists (select 1 from public.inv_skus s where s.id = v_sku_id and s.is_active = true) then
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

    update public.inv_stock_balances
    set quantity = quantity - v_qty,
        updated_at = now()
    where sku_id = v_sku_id
      and warehouse_id = p_warehouse_id;

    insert into public.inv_stock_movements (
      sku_id,
      warehouse_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      created_by,
      notes
    )
    values (
      v_sku_id,
      p_warehouse_id,
      'consumption',
      -v_qty,
      'consumption',
      v_consumption_id,
      v_actor_id,
      coalesce(v_notes, p_notes, 'Inventory consumption')
    );

    v_ids := array_append(v_ids, v_consumption_id);
  end loop;

  return v_ids;
end;
$$;

revoke all on function public.inv_record_consumption(uuid, uuid, jsonb, text) from public;
grant execute on function public.inv_record_consumption(uuid, uuid, jsonb, text) to authenticated;

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

  update public.inv_stock_balances
  set quantity = quantity - v_damage.qty,
      updated_at = now()
  where sku_id = v_damage.sku_id
    and warehouse_id = v_damage.warehouse_id;

  update public.inv_damages
  set status = 'approved',
      approver_id = v_actor_id,
      approved_at = now(),
      rejected_at = null,
      rejection_reason = null
  where id = p_damage_id;

  insert into public.inv_stock_movements (
    sku_id,
    warehouse_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    created_by,
    notes
  )
  values (
    v_damage.sku_id,
    v_damage.warehouse_id,
    'damage',
    -v_damage.qty,
    'damage',
    p_damage_id,
    v_actor_id,
    'Inventory damage approved'
  );
end;
$$;

revoke all on function public.inv_approve_damage(uuid) from public;
grant execute on function public.inv_approve_damage(uuid) to authenticated;

create or replace function public.inv_reject_damage(
  p_damage_id uuid,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.inv_reject_damage(uuid, text) from public;
grant execute on function public.inv_reject_damage(uuid, text) to authenticated;
