-- Production-default suppliers for inbound orders (idempotent)

insert into public.inv_suppliers (code, name, is_active)
values
  ('SUP-GENERAL', 'ผู้จำหน่ายทั่วไป', true),
  ('SUP-MARKET', 'ซื้อตลาด / ซื้อเอง', true),
  ('SUP-INTERNAL', 'รับเข้าภายใน / โอนคลัง', true)
on conflict (code) do nothing;
