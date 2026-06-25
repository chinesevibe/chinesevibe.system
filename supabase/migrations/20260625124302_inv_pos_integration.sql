create table if not exists public.inv_integration_events (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  event_type text not null,
  external_ref text not null,
  branch_id uuid references public.inv_branches (id) on delete set null,
  warehouse_id uuid references public.inv_warehouses (id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  consumption_ids uuid[] null,
  error_message text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  unique (source_system, event_type, external_ref)
);

create index if not exists inv_integration_events_status_created_idx
  on public.inv_integration_events (status, created_at desc);

create index if not exists inv_integration_events_branch_created_idx
  on public.inv_integration_events (branch_id, created_at desc);

alter table public.inv_integration_events enable row level security;

drop policy if exists inv_integration_events_select on public.inv_integration_events;
create policy inv_integration_events_select on public.inv_integration_events
  for select to authenticated
  using (public.hr_is_hr_admin() or public.hr_is_dev());

drop policy if exists inv_integration_events_insert on public.inv_integration_events;
create policy inv_integration_events_insert on public.inv_integration_events
  for insert to service_role
  with check (true);

drop policy if exists inv_integration_events_update on public.inv_integration_events;
create policy inv_integration_events_update on public.inv_integration_events
  for update to service_role
  using (true)
  with check (true);

create or replace function public.inv_record_pos_consumption(
  p_recorded_by uuid,
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
  select e.id into v_actor_id
  from public.hr_employees e
  where e.id = p_recorded_by
    and e.status = 'active';

  if v_actor_id is null then
    raise exception 'integration actor not active';
  end if;

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

    select * into v_sku
    from public.inv_skus
    where id = v_sku_id
      and is_active = true;

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
      select *
      from public.inv_allocate_fefo(v_sku_id, p_warehouse_id, v_qty, v_sku.default_issue_method)
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
        coalesce(v_notes, p_notes, 'POS inventory integration'),
        null
      );
    end loop;

    v_ids := array_append(v_ids, v_consumption_id);
  end loop;

  return v_ids;
end;
$$;

revoke all on function public.inv_record_pos_consumption(uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.inv_record_pos_consumption(uuid, uuid, uuid, jsonb, text) to service_role;
