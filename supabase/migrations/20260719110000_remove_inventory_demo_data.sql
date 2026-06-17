-- Remove UAT demo inventory data (DEMO-HQ, SKU-DEMO-*, etc.) for production go-live

do $$
declare
  v_demo_sku_ids uuid[];
  v_demo_wh_ids uuid[];
  v_demo_branch_ids uuid[];
begin
  select coalesce(array_agg(id), '{}')
  into v_demo_sku_ids
  from public.inv_skus
  where code like 'SKU-DEMO-%';

  select coalesce(array_agg(id), '{}')
  into v_demo_wh_ids
  from public.inv_warehouses
  where code in ('WH-DEMO', 'DEMO-WH') or code like 'DEMO-%';

  select coalesce(array_agg(id), '{}')
  into v_demo_branch_ids
  from public.inv_branches
  where code in ('DEMO-HQ', 'DEMO') or code like 'DEMO-%';

  if cardinality(v_demo_sku_ids) = 0
     and cardinality(v_demo_wh_ids) = 0
     and cardinality(v_demo_branch_ids) = 0 then
    return;
  end if;

  delete from public.inv_requisition_issue_lines
  where lot_id in (
    select id from public.inv_stock_lots
    where sku_id = any (v_demo_sku_ids)
       or warehouse_id = any (v_demo_wh_ids)
  );

  delete from public.inv_stock_movements
  where sku_id = any (v_demo_sku_ids)
     or warehouse_id = any (v_demo_wh_ids);

  delete from public.inv_stock_lots
  where sku_id = any (v_demo_sku_ids)
     or warehouse_id = any (v_demo_wh_ids);

  delete from public.inv_stock_balances
  where sku_id = any (v_demo_sku_ids)
     or warehouse_id = any (v_demo_wh_ids);

  delete from public.inv_inbound_items
  where sku_id = any (v_demo_sku_ids)
     or inbound_order_id in (
       select id from public.inv_inbound_orders
       where warehouse_id = any (v_demo_wh_ids)
     );

  delete from public.inv_inbound_orders
  where warehouse_id = any (v_demo_wh_ids);

  delete from public.inv_boms
  where sku_id = any (v_demo_sku_ids)
     or ingredient_sku_id = any (v_demo_sku_ids);

  delete from public.inv_skus
  where id = any (v_demo_sku_ids);

  delete from public.inv_warehouses
  where id = any (v_demo_wh_ids);

  delete from public.inv_suppliers
  where code in ('SUP-DEMO', 'DEMO-SUP') or code like 'SUP-DEMO%';

  delete from public.inv_branches
  where id = any (v_demo_branch_ids);
end $$;
