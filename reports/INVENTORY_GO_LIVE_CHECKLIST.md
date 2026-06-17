# Inventory Go-Live — ข้อมูลพร้อมใช้งานจริง

อัปเดต: 2026-06-17

## สถานะหลัง cleanup

- ลบ demo seed (`DEMO-HQ`, `SKU-DEMO-*`, `SUP-DEMO`, `WH-DEMO`) จาก production แล้ว
- ระบบพร้อมกรอก master data จริง — **ไม่มี mock stock**

## ลำดับตั้งค่า (HR / คลัง)

1. **สาขาคลัง** `/admin/inventory/branches` — สร้างสาขา + ผูก `สาขา HR` (optional)
2. **คลัง** `/admin/inventory/warehouses` — 1 สาขา → อย่างน้อย 1 คลัง `main`
3. **Supplier** `/admin/inventory/suppliers`
4. **SKU** `/admin/inventory/sku` — ตั้ง `expiry_required`, `lot_tracking` ตามจริง
5. **รับเข้า** `/admin/inventory/inbound` — สร้าง order → อนุมัติ → สร้าง lot อัตโนมัติ
6. **ตรวจสต็อก** `/admin/inventory/stock` — ยอดรวม + แยก lot
7. **ตั้ง role** — พนักงานคลัง → `inventory`, ผู้บริหาร → `ceo`

## สิทธิ์

| Role | สิทธิ์คลัง |
|------|------------|
| inventory | งานคลังเต็ม (เบิก โอน รับเข้า damage) |
| hr / dev | admin + master data |
| ceo | อ่านอย่างเดียว |

## BOM (optional)

`/admin/inventory/bom` — กำหนดสูตร → ปุ่ม「ตัดตามสูตร」ใช้ FEFO ตัดวัตถุดิบ

## UAT checklist

- [ ] Inbound approve → lot ปรากฏในหน้าสต็อก
- [ ] ใบเบิก + FEFO preview
- [ ] โอนสินค้า + เลือก lot
- [ ] แจ้งเสียหาย + เลือก lot
- [ ] นับสต็อก + finalize
- [ ] รายงาน FEFO Override (ถ้ามี override)
