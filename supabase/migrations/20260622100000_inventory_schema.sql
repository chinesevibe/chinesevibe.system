-- Inventory module (inv_* prefix — separate from hr_branches)

create table if not exists public.inv_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abbreviation text,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  from_unit_id uuid references public.inv_units (id) on delete cascade,
  to_unit_id uuid references public.inv_units (id) on delete cascade,
  factor numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_skus (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text,
  unit_id uuid references public.inv_units (id),
  barcode text,
  min_stock numeric not null default 0,
  max_stock numeric not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  branch_id uuid not null references public.inv_branches (id) on delete cascade,
  type text not null default 'main' check (type in ('main', 'sub')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_boms (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid references public.inv_skus (id) on delete cascade,
  ingredient_sku_id uuid references public.inv_skus (id) on delete cascade,
  quantity numeric not null,
  unit_id uuid references public.inv_units (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inv_stock_balances (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.inv_skus (id) on delete cascade,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete cascade,
  quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sku_id, warehouse_id)
);

create table if not exists public.inv_inbound_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.inv_suppliers (id),
  warehouse_id uuid references public.inv_warehouses (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled')),
  received_date timestamptz,
  notes text,
  created_by uuid references public.hr_employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_inbound_items (
  id uuid primary key default gen_random_uuid(),
  inbound_order_id uuid not null references public.inv_inbound_orders (id) on delete cascade,
  sku_id uuid references public.inv_skus (id),
  quantity numeric not null,
  cost_per_unit numeric,
  lot_number text,
  expiry_date date,
  created_at timestamptz not null default now()
);

create trigger inv_skus_set_updated_at
  before update on public.inv_skus
  for each row execute function public.hr_set_updated_at();

create trigger inv_suppliers_set_updated_at
  before update on public.inv_suppliers
  for each row execute function public.hr_set_updated_at();

create trigger inv_branches_set_updated_at
  before update on public.inv_branches
  for each row execute function public.hr_set_updated_at();

create trigger inv_warehouses_set_updated_at
  before update on public.inv_warehouses
  for each row execute function public.hr_set_updated_at();

create trigger inv_stock_balances_set_updated_at
  before update on public.inv_stock_balances
  for each row execute function public.hr_set_updated_at();

create trigger inv_inbound_orders_set_updated_at
  before update on public.inv_inbound_orders
  for each row execute function public.hr_set_updated_at();

insert into public.inv_units (name, abbreviation)
values
  ('ชิ้น', 'pcs'),
  ('กิโลกรัม', 'kg'),
  ('กรัม', 'g'),
  ('ลิตร', 'L'),
  ('มิลลิลิตร', 'ml'),
  ('แพ็ค', 'pack'),
  ('ถุง', 'bag'),
  ('กล่อง', 'box')
on conflict do nothing;

-- RLS: active employees read; HR admin write
alter table public.inv_units enable row level security;
alter table public.inv_unit_conversions enable row level security;
alter table public.inv_skus enable row level security;
alter table public.inv_suppliers enable row level security;
alter table public.inv_branches enable row level security;
alter table public.inv_warehouses enable row level security;
alter table public.inv_boms enable row level security;
alter table public.inv_stock_balances enable row level security;
alter table public.inv_inbound_orders enable row level security;
alter table public.inv_inbound_items enable row level security;

create policy inv_units_select on public.inv_units
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_units_write on public.inv_units
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_unit_conversions_select on public.inv_unit_conversions
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_unit_conversions_write on public.inv_unit_conversions
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_skus_select on public.inv_skus
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_skus_write on public.inv_skus
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_suppliers_select on public.inv_suppliers
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_suppliers_write on public.inv_suppliers
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_branches_select on public.inv_branches
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_branches_write on public.inv_branches
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_warehouses_select on public.inv_warehouses
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_warehouses_write on public.inv_warehouses
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_boms_select on public.inv_boms
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_boms_write on public.inv_boms
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_stock_balances_select on public.inv_stock_balances
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_stock_balances_write on public.inv_stock_balances
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_inbound_orders_select on public.inv_inbound_orders
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_inbound_orders_write on public.inv_inbound_orders
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());

create policy inv_inbound_items_select on public.inv_inbound_items
  for select using (hr_is_hr_admin() or hr_is_ceo() or hr_employee_id() is not null);

create policy inv_inbound_items_write on public.inv_inbound_items
  for all using (hr_is_hr_admin()) with check (hr_is_hr_admin());
