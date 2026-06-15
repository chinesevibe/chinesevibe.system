-- T141/T143: Stock count + branch transfer schemas (RLS only; finalize/send/receive RPCs later)

create table if not exists public.inv_stock_counts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.inv_branches (id) on delete restrict,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  scope text not null default 'all'
    check (scope in ('all', 'category', 'sku')),
  status text not null default 'draft'
    check (status in ('draft', 'counting', 'completed', 'cancelled')),
  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.hr_employees (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_stock_count_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inv_stock_counts (id) on delete cascade,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  system_qty numeric not null check (system_qty >= 0),
  physical_qty numeric check (physical_qty is null or physical_qty >= 0),
  lot_number text,
  counted_by uuid references public.hr_employees (id) on delete set null,
  counted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_stock_count_items_count_sku_unique unique (count_id, sku_id)
);

create table if not exists public.inv_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  count_id uuid references public.inv_stock_counts (id) on delete set null,
  warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty_delta numeric not null check (qty_delta <> 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'applied')),
  created_by uuid not null references public.hr_employees (id) on delete restrict,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inv_transfers (
  id uuid primary key default gen_random_uuid(),
  from_warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  to_warehouse_id uuid not null references public.inv_warehouses (id) on delete restrict,
  from_branch_id uuid not null references public.inv_branches (id) on delete restrict,
  to_branch_id uuid not null references public.inv_branches (id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'in_transit', 'received', 'cancelled')),
  shipper text,
  created_by uuid not null references public.hr_employees (id) on delete restrict,
  sent_by uuid references public.hr_employees (id) on delete set null,
  received_by uuid references public.hr_employees (id) on delete set null,
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_transfers_warehouses_distinct check (from_warehouse_id <> to_warehouse_id),
  constraint inv_transfers_branches_distinct check (from_branch_id <> to_branch_id)
);

create table if not exists public.inv_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.inv_transfers (id) on delete cascade,
  sku_id uuid not null references public.inv_skus (id) on delete restrict,
  qty_sent numeric not null check (qty_sent > 0),
  qty_received numeric not null default 0 check (qty_received >= 0),
  lot_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_transfer_items_qty_received_lte_sent check (qty_received <= qty_sent),
  constraint inv_transfer_items_transfer_sku_unique unique (transfer_id, sku_id)
);

create index if not exists inv_stock_counts_branch_status_idx
  on public.inv_stock_counts (branch_id, status);
create index if not exists inv_stock_counts_warehouse_status_idx
  on public.inv_stock_counts (warehouse_id, status);
create index if not exists inv_stock_counts_status_created_idx
  on public.inv_stock_counts (status, created_at desc);
create index if not exists inv_stock_count_items_count_idx
  on public.inv_stock_count_items (count_id);
create index if not exists inv_stock_count_items_sku_idx
  on public.inv_stock_count_items (sku_id);
create index if not exists inv_stock_adjustments_count_idx
  on public.inv_stock_adjustments (count_id);
create index if not exists inv_stock_adjustments_warehouse_status_idx
  on public.inv_stock_adjustments (warehouse_id, status);
create index if not exists inv_stock_adjustments_sku_idx
  on public.inv_stock_adjustments (sku_id);
create index if not exists inv_transfers_from_branch_status_idx
  on public.inv_transfers (from_branch_id, status);
create index if not exists inv_transfers_to_branch_status_idx
  on public.inv_transfers (to_branch_id, status);
create index if not exists inv_transfers_status_created_idx
  on public.inv_transfers (status, created_at desc);
create index if not exists inv_transfer_items_transfer_idx
  on public.inv_transfer_items (transfer_id);
create index if not exists inv_transfer_items_sku_idx
  on public.inv_transfer_items (sku_id);

drop trigger if exists inv_stock_counts_set_updated_at on public.inv_stock_counts;
create trigger inv_stock_counts_set_updated_at
  before update on public.inv_stock_counts
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_stock_count_items_set_updated_at on public.inv_stock_count_items;
create trigger inv_stock_count_items_set_updated_at
  before update on public.inv_stock_count_items
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_stock_adjustments_set_updated_at on public.inv_stock_adjustments;
create trigger inv_stock_adjustments_set_updated_at
  before update on public.inv_stock_adjustments
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_transfers_set_updated_at on public.inv_transfers;
create trigger inv_transfers_set_updated_at
  before update on public.inv_transfers
  for each row execute function public.hr_set_updated_at();

drop trigger if exists inv_transfer_items_set_updated_at on public.inv_transfer_items;
create trigger inv_transfer_items_set_updated_at
  before update on public.inv_transfer_items
  for each row execute function public.hr_set_updated_at();

alter table public.inv_stock_counts enable row level security;
alter table public.inv_stock_count_items enable row level security;
alter table public.inv_stock_adjustments enable row level security;
alter table public.inv_transfers enable row level security;
alter table public.inv_transfer_items enable row level security;

drop policy if exists inv_stock_counts_select on public.inv_stock_counts;
create policy inv_stock_counts_select on public.inv_stock_counts
  for select using (public.inv_can_manage_requisitions());

drop policy if exists inv_stock_counts_insert on public.inv_stock_counts;
create policy inv_stock_counts_insert on public.inv_stock_counts
  for insert with check (
    created_by = public.hr_employee_id()
    and public.inv_can_manage_requisitions()
  );

drop policy if exists inv_stock_counts_update on public.inv_stock_counts;
create policy inv_stock_counts_update on public.inv_stock_counts
  for update using (public.inv_can_manage_requisitions())
  with check (public.inv_can_manage_requisitions());

drop policy if exists inv_stock_count_items_select on public.inv_stock_count_items;
create policy inv_stock_count_items_select on public.inv_stock_count_items
  for select using (
    exists (
      select 1
      from public.inv_stock_counts c
      where c.id = count_id
        and public.inv_can_manage_requisitions()
    )
  );

drop policy if exists inv_stock_count_items_insert on public.inv_stock_count_items;
create policy inv_stock_count_items_insert on public.inv_stock_count_items
  for insert with check (
    exists (
      select 1
      from public.inv_stock_counts c
      where c.id = count_id
        and public.inv_can_manage_requisitions()
    )
  );

drop policy if exists inv_stock_count_items_update on public.inv_stock_count_items;
create policy inv_stock_count_items_update on public.inv_stock_count_items
  for update using (
    exists (
      select 1
      from public.inv_stock_counts c
      where c.id = count_id
        and public.inv_can_manage_requisitions()
    )
  )
  with check (
    exists (
      select 1
      from public.inv_stock_counts c
      where c.id = count_id
        and public.inv_can_manage_requisitions()
    )
  );

drop policy if exists inv_stock_adjustments_select on public.inv_stock_adjustments;
create policy inv_stock_adjustments_select on public.inv_stock_adjustments
  for select using (public.inv_can_manage_requisitions());

drop policy if exists inv_stock_adjustments_insert on public.inv_stock_adjustments;
create policy inv_stock_adjustments_insert on public.inv_stock_adjustments
  for insert with check (
    created_by = public.hr_employee_id()
    and public.inv_can_manage_requisitions()
  );

drop policy if exists inv_stock_adjustments_update on public.inv_stock_adjustments;
create policy inv_stock_adjustments_update on public.inv_stock_adjustments
  for update using (public.inv_can_manage_requisitions())
  with check (public.inv_can_manage_requisitions());

drop policy if exists inv_transfers_select on public.inv_transfers;
create policy inv_transfers_select on public.inv_transfers
  for select using (public.inv_can_manage_requisitions());

drop policy if exists inv_transfers_insert on public.inv_transfers;
create policy inv_transfers_insert on public.inv_transfers
  for insert with check (
    created_by = public.hr_employee_id()
    and public.inv_can_manage_requisitions()
  );

drop policy if exists inv_transfers_update on public.inv_transfers;
create policy inv_transfers_update on public.inv_transfers
  for update using (public.inv_can_manage_requisitions())
  with check (public.inv_can_manage_requisitions());

drop policy if exists inv_transfer_items_select on public.inv_transfer_items;
create policy inv_transfer_items_select on public.inv_transfer_items
  for select using (
    exists (
      select 1
      from public.inv_transfers t
      where t.id = transfer_id
        and public.inv_can_manage_requisitions()
    )
  );

drop policy if exists inv_transfer_items_insert on public.inv_transfer_items;
create policy inv_transfer_items_insert on public.inv_transfer_items
  for insert with check (
    exists (
      select 1
      from public.inv_transfers t
      where t.id = transfer_id
        and public.inv_can_manage_requisitions()
    )
  );

drop policy if exists inv_transfer_items_update on public.inv_transfer_items;
create policy inv_transfer_items_update on public.inv_transfer_items
  for update using (
    exists (
      select 1
      from public.inv_transfers t
      where t.id = transfer_id
        and public.inv_can_manage_requisitions()
    )
  )
  with check (
    exists (
      select 1
      from public.inv_transfers t
      where t.id = transfer_id
        and public.inv_can_manage_requisitions()
    )
  );
