-- T134: Inbound Phase 4 — draft status + approve RPC (stock increment)

alter table public.inv_inbound_orders
  drop constraint if exists inv_inbound_orders_status_check;

alter table public.inv_inbound_orders
  add constraint inv_inbound_orders_status_check
  check (status in ('draft', 'pending', 'approved', 'cancelled'));

alter table public.inv_inbound_orders
  alter column status set default 'draft';

create or replace function public.inv_approve_inbound_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.inv_inbound_orders%rowtype;
  v_item public.inv_inbound_items%rowtype;
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

  for v_item in
    select * from public.inv_inbound_items
    where inbound_order_id = p_order_id
  loop
    if v_item.sku_id is null or v_item.quantity <= 0 then
      continue;
    end if;

    insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
    values (v_item.sku_id, v_order.warehouse_id, v_item.quantity)
    on conflict (sku_id, warehouse_id) do update
      set quantity = public.inv_stock_balances.quantity + excluded.quantity,
          updated_at = now();
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
