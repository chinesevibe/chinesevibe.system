-- Demo seed for inventory UAT (idempotent — safe to re-run)
-- Phase 1.5: 1 branch → 1 warehouse → supplier → sample SKUs + stock balances

insert into public.inv_branches (code, name, address, is_active)
values ('DEMO-HQ', 'Demo สาขาหลัก', 'Bangkok — UAT seed', true)
on conflict (code) do nothing;

insert into public.inv_suppliers (code, name, contact, is_active)
values ('SUP-DEMO', 'Demo Supplier Co.', 'demo@supplier.local', true)
on conflict (code) do nothing;

insert into public.inv_warehouses (code, name, branch_id, type, is_active)
select
  'WH-DEMO',
  'Demo Main Warehouse',
  b.id,
  'main',
  true
from public.inv_branches b
where b.code = 'DEMO-HQ'
on conflict (code) do nothing;

insert into public.inv_skus (code, name, category, unit_id, barcode, min_stock, max_stock, is_active)
select v.code, v.name, v.category, u.id, v.barcode, v.min_stock, v.max_stock, true
from (
  values
    ('SKU-DEMO-001', 'Demo น้ำจิ้ม', 'Sauce', '8850000000001', 10::numeric, 100::numeric),
    ('SKU-DEMO-002', 'Demo หมูสับ', 'Meat', '8850000000002', 5::numeric, 50::numeric),
    ('SKU-DEMO-003', 'Demo ผักรวม', 'Vegetable', '8850000000003', 8::numeric, 80::numeric),
    ('SKU-DEMO-004', 'Demo กล่องใส่อาหาร', 'Packaging', '8850000000004', 20::numeric, 200::numeric),
    ('SKU-DEMO-005', 'Demo น้ำดื่ม', 'Beverage', '8850000000005', 15::numeric, 150::numeric)
) as v(code, name, category, barcode, min_stock, max_stock)
cross join lateral (
  select id from public.inv_units where abbreviation = 'pcs' limit 1
) u
on conflict (code) do nothing;

insert into public.inv_stock_balances (sku_id, warehouse_id, quantity)
select s.id, w.id, v.qty
from (
  values
    ('SKU-DEMO-001', 3::numeric),
    ('SKU-DEMO-002', 2::numeric),
    ('SKU-DEMO-003', 12::numeric),
    ('SKU-DEMO-004', 0::numeric),
    ('SKU-DEMO-005', 25::numeric)
) as v(sku_code, qty)
join public.inv_skus s on s.code = v.sku_code
join public.inv_warehouses w on w.code = 'WH-DEMO'
on conflict (sku_id, warehouse_id) do update
  set quantity = excluded.quantity,
      updated_at = now();
