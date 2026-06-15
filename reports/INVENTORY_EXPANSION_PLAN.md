# Inventory Management — Expansion Plan (PRD Alignment)

**Created:** 2026-06-13  
**Owner:** Cursor orchestrator  
**Target agent:** Codex (GPT-5.5)  
**PRD Reference:** `/Users/jakarinosk/HEAD-OFFICE/head-office-app/public/inventory-prd.html`  
**Project:** hr-payroll-client → hr-app `/admin/inventory`

---

## Executive Summary

The existing Inventory module (T130-T135, Phases 1-4) covers ~40% of the comprehensive PRD. This plan adds **9 new features** across **14 new tasks** (T136-T149) to achieve 100% PRD coverage for a multi-branch restaurant Inventory Management System.

**Current state (T135 done):**
- ✅ Master Data (SKU, Supplier, Warehouse, Branch)
- ✅ Stock Balances visibility
- ✅ Inbound Orders + LIFF barcode scanner
- ✅ Portal inbound hub
- ⚠️ BOM (basic — only schema, no consumption logic)
- ⚠️ Unit Conversion (schema only — no conversion logic)

**PRD Gap Analysis:**
- ❌ Kitchen Requisition (4-step workflow: request → approve → issue → receive)
- ❌ Consumption & Damage tracking (separate from requisition)
- ❌ Stock Count (plan → count → variance → adjustment)
- ❌ Transfer between branches
- ❌ Alerts (expiry, low stock, anomalies)
- ❌ Dashboard executive KPIs (graphs, trends)
- ❌ Reports (9 types — only 3 widgets exist)
- ❌ BOM consumption logic (deduct by recipe)
- ❌ Unit Conversion runtime (cross-unit stock operations)

---

## PRD Feature Matrix

| Module | PRD Feature | Current | Gap | Tasks | Priority |
|--------|-------------|---------|-----|-------|----------|
| **M1** Master Data | SKU, Supplier, Warehouse, Branch | ✅ | Unit Conversion runtime | T136 | P1 |
| **M1** Master Data | BOM (recipe) | ⚠️ Schema | Consumption logic | T137 | P2 |
| **M2** Inbound | Goods receipt + barcode | ✅ | — | — | — |
| **M3** Kitchen Requisition | 4-step workflow | ❌ | Full | T138-T139 | P1 |
| **M4** Consumption & Damage | Usage tracking + damage reports | ❌ | Full | T140 | P1 |
| **M5** Stock Count | Plan → count → adjust | ❌ | Full | T141-T142 | P1 |
| **M6** Transfer | Branch-to-branch | ❌ | Full | T143 | P1 |
| **M7** Alerts | Expiry, low stock, anomalies | ❌ | Full | T144 | P2 |
| **M8** Dashboard | Executive KPIs + trends | ⚠️ 3 widgets | 7 KPIs + graphs | T145 | P1 |
| **M9** Reports | 9 report types | ⚠️ 3 widgets | 6 more | T146-T148 | P2 |
| **M10** Mobile/PDA | LIFF scan | ✅ | Expand use cases | T149 | P3 |

---

## Task Breakdown (T136–T149)

### Phase 5: Foundation Extensions (T136–T137)

**T136** — Unit Conversion Runtime Logic  
**Agent:** Codex  
**Depends:** T135  
**Priority:** P1

**Goal:** Implement runtime unit conversion for stock operations (inbound, requisition, consumption, transfer).

**Deliverables:**
- `src/lib/inventory/unit-conversion.ts` — conversion helpers
- Server actions: `convertQuantity(skuId, qty, fromUnit, toUnit)` → normalized qty
- Inbound: allow receiving in secondary unit (e.g., "ลัง 12 ชิ้น" → convert to base unit "ชิ้น")
- Stock balance: always stored in **base unit**
- UI: show conversion rate when selecting secondary unit
- Acceptance: create SKU with 2 units → receive 1 ลัง (12 ชิ้น) → stock balance +12 ชิ้น

---

**T137** — BOM Consumption Logic (Optional P2)  
**Agent:** Codex  
**Depends:** T136, T140 (consumption tracking)  
**Priority:** P2 (can defer)

**Goal:** Auto-deduct stock based on BOM when recording sales/production.

**Deliverables:**
- Server action: `consumeByRecipe(menuId, quantity)` → deduct components
- UI at `/admin/inventory/consumption` — option "ตัดตามสูตร" vs "ตัดแบบกำหนดเอง"
- Consumption log: link to BOM used
- Acceptance: sell 10 ชาม ก๋วยเตี๋ยว (BOM: เส้น 200g, น้ำซุป 300ml) → stock auto-deducts

---

### Phase 6: Kitchen Requisition (T138–T139)

**T138** — Kitchen Requisition Web Admin (Create + Approve)  
**Agent:** Codex  
**Depends:** T136  
**Priority:** P1

**Goal:** 4-step workflow — request → approve → issue → receive.

**Deliverables:**
- **Schema:** `inv_requisitions` (id, branch_id, requester_id, status: draft/pending/approved/issued/completed/rejected, created_at)
- **Schema:** `inv_requisition_items` (requisition_id, sku_id, qty_requested, qty_approved, qty_issued, qty_received, lot_number)
- **Routes:**
  - `/admin/inventory/requisition` — list (HR/หัวหน้าคลัง)
  - `/admin/inventory/requisition/create` — หัวหน้าครัวสร้างใบเบิก
  - `/admin/inventory/requisition/[id]` — detail + approve/issue/receive actions
- **Flow:**
  1. หัวหน้าครัว: สร้างใบ (status=draft) → submit (pending)
  2. หัวหน้าคลัง: approve (อนุมัติเต็ม / บางส่วน / reject)
  3. เจ้าหน้าที่คลัง: issue (จ่ายสินค้า — ระบุ Lot, qty_issued)
  4. หัวหน้าครัว: receive (confirm รับ — qty_received)
- **Stock impact:** ตัดยอด **เมื่อ issue** (ไม่ใช่ approve)
- **RLS:** requester ดูได้แค่ของตัวเอง; HR/หัวหน้าคลังดูทั้งหมด
- **Audit:** `inv_stock_movements` (type=requisition_issue)
- **Acceptance:**
  - หัวหน้าครัวสร้างใบเบิก 3 SKU → HR approve 2/3 → คลังจ่าย → stock balance ลดถูกต้อง
  - ครัวยืนยันรับ qty_received < qty_issued → ระบบบันทึกส่วนต่าง

---

**T139** — Requisition Mobile View (Optional)  
**Agent:** Codex  
**Depends:** T138  
**Priority:** P3

**Goal:** หัวหน้าครัวสร้างใบเบิกผ่านมือถือ (responsive web).

**Deliverables:**
- Mobile-optimized UI for `/admin/inventory/requisition/create`
- Barcode scan to add SKU quickly
- Acceptance: สร้างใบเบิกจากมือถือ → submit → HR approve ผ่าน desktop

---

### Phase 7: Consumption & Damage (T140)

**T140** — Consumption & Damage Tracking  
**Agent:** Codex  
**Depends:** T136  
**Priority:** P1

**Goal:** แยกรายงานการใช้จริง (consumption) vs การสูญเสีย (damage/spoilage/expiry).

**Deliverables:**
- **Schema:** `inv_consumptions` (id, branch_id, sku_id, qty, consumption_type: production/sampling/testing, recorded_by, recorded_at, notes)
- **Schema:** `inv_damages` (id, branch_id, sku_id, qty, damage_type: damaged/spoiled/expired/lost/adjustment, reason, photo_url, status: pending/approved/rejected, approver_id, approved_at)
- **Routes:**
  - `/admin/inventory/consumption` — บันทึกการใช้จริง (รายวัน/รายสัปดาห์)
  - `/admin/inventory/damage` — list + create damage report
  - `/admin/inventory/damage/[id]` — detail + approve/reject
- **Approval flow (damage):**
  - มูลค่า ≤ 500 บาท: auto-approve
  - มูลค่า > 500 บาท: รอ HR approve
  - มูลค่า > 5000 บาท: รอ Admin approve
- **Photo upload:** Supabase Storage `inventory-damage-photos/`
- **Stock impact:** ตัดยอดเมื่อ approved
- **Audit:** `inv_stock_movements` (type=consumption / type=damage)
- **Report:** แยกรายงาน Consumption vs Damage ใน Dashboard
- **Acceptance:**
  - บันทึกใช้จริง 10kg เนื้อหมู → stock ลด 10kg → Movement type=consumption
  - บันทึกชำรุด 5kg ผัก (photo + reason) → auto-approve → stock ลด 5kg → Movement type=damage

---

### Phase 8: Stock Count (T141–T142)

**T141** — Stock Count Plan & Execution  
**Agent:** Codex  
**Depends:** T136  
**Priority:** P1

**Goal:** ตรวจนับสต๊อก → เปรียบเทียบยอด → สร้าง Adjustment.

**Deliverables:**
- **Schema:** `inv_stock_counts` (id, branch_id, warehouse_id, scope: all/category/sku, status: draft/counting/completed/cancelled, planned_at, started_at, completed_at, created_by)
- **Schema:** `inv_stock_count_items` (count_id, sku_id, system_qty, physical_qty, variance, variance_value, lot_number, counted_by, counted_at)
- **Routes:**
  - `/admin/inventory/stock-count` — list plans
  - `/admin/inventory/stock-count/create` — สร้างแผนตรวจนับ
  - `/admin/inventory/stock-count/[id]` — detail + นับ + finalize
- **Flow:**
  1. สร้างแผน: ระบุ warehouse, scope (หมวดหมู่/SKU ทั้งหมด), วันที่
  2. ระบบสร้างรายการ SKU ที่ต้องนับ (snapshot `system_qty` ณ เวลาสร้าง)
  3. เจ้าหน้าที่: นับ + บันทึก `physical_qty` (mobile/PDA)
  4. Finalize: ระบบคำนวณ variance + สร้าง `inv_stock_adjustments` auto
- **Variance report:** แสดง SKU ที่เกิน/ขาด + มูลค่าส่วนต่าง
- **Stock impact:** adjustment เมื่อ finalize + approve
- **Audit:** `inv_stock_movements` (type=stock_count_adjustment)
- **Acceptance:**
  - สร้างแผนตรวจนับคลัง A → นับ 50 SKU → 3 SKU มี variance → finalize → adjustment สร้างอัตโนมัติ

---

**T142** — Stock Count Mobile Interface  
**Agent:** Codex  
**Depends:** T141  
**Priority:** P2

**Goal:** Mobile-optimized counting UI + barcode scan.

**Deliverables:**
- Mobile route: `/m/inventory/count/[countId]` (LINE LIFF หรือ responsive web)
- Barcode scan → ค้นหา SKU → บันทึก physical_qty
- Offline-first (optional P3): cache รายการ → sync เมื่อมี network
- Acceptance: สแกน barcode → นับยอด → save → ระบบอัปเดต `physical_qty`

---

### Phase 9: Transfer (T143)

**T143** — Branch-to-Branch Transfer  
**Agent:** Codex  
**Depends:** T136  
**Priority:** P1

**Goal:** โอนสินค้าระหว่างสาขา — source ลดยอด → destination เพิ่มยอด.

**Deliverables:**
- **Schema:** `inv_transfers` (id, from_branch_id, to_branch_id, status: draft/in_transit/received/cancelled, shipper, created_by, sent_at, received_at)
- **Schema:** `inv_transfer_items` (transfer_id, sku_id, qty_sent, qty_received, lot_number)
- **Routes:**
  - `/admin/inventory/transfer` — list
  - `/admin/inventory/transfer/create` — สร้างใบโอน
  - `/admin/inventory/transfer/[id]` — detail + send/receive actions
- **Flow:**
  1. หัวหน้าคลัง (source): สร้างใบโอน (status=draft) → send (in_transit) → stock source ลดทันที (จอง)
  2. หัวหน้าคลัง (destination): receive → บันทึก qty_received → stock destination เพิ่ม
- **Variance handling:** qty_received < qty_sent → damage report สำหรับส่วนต่าง (optional)
- **Photo upload:** แนบรูปสินค้าก่อนส่ง / หลังรับ (optional)
- **Stock impact:**
  - Send: source `-qty_sent` (type=transfer_out)
  - Receive: destination `+qty_received` (type=transfer_in)
- **Audit:** `inv_stock_movements` (type=transfer_out / transfer_in)
- **Acceptance:**
  - สาขา A โอน 20 kg เนื้อหมู → สาขา B → B รับ 19 kg (1 kg เสียหาย) → stock A -20, B +19

---

### Phase 10: Alerts (T144)

**T144** — Inventory Alerts  
**Agent:** Codex  
**Depends:** T140, T141  
**Priority:** P2

**Goal:** แจ้งเตือนสินค้าใกล้หมดอายุ / ต่ำกว่า Min Stock / รายการผิดปกติ.

**Deliverables:**
- **Alert UI:** `/admin/inventory/alerts` — list alerts (HR/ผู้บริหาร)
- **3 Alert types:**
  1. **Expiry Alert:** Lot หมดอายุใน 30/14/7/1 วัน (กรองตามวันที่ expiry_date)
  2. **Low Stock Alert:** SKU คงเหลือ ≤ min_stock_level
  3. **Anomaly Alert:** Damage > 5% ของมูลค่าสต๊อก, variance > 10% ในตรวจนับ
- **Badge:** แสดงจำนวน alerts บน sidebar inventory menu
- **Email/LINE notify (optional P3):** send daily summary
- **Filters:** branch, warehouse, alert type, severity (high/medium/low)
- **Action from alert:** link to SKU / Lot / Damage report / Stock count
- **Acceptance:**
  - Lot หมดอายุใน 5 วัน → แสดงใน alerts (expiry)
  - SKU คงเหลือ 2 ชิ้น (min=10) → แสดงใน alerts (low stock)
  - Damage 50k บาท (สต๊อกรวม 100k) → แสดง anomaly alert

---

### Phase 11: Dashboard Expansion (T145)

**T145** — Executive Dashboard KPIs & Graphs  
**Agent:** Codex  
**Depends:** T140, T143, T144  
**Priority:** P1

**Goal:** ขยาย Dashboard จาก 3 widgets → 10+ KPIs + 4 graphs.

**Deliverables:**
- **Route:** `/admin/inventory/dashboard` (แยกจาก `/admin/report` — inventory-focused)
- **10 KPI Cards:**
  1. มูลค่าสต๊อกคงเหลือรวม (Total Inventory Value)
  2. จำนวน SKU ทั้งหมด
  3. จำนวน SKU ต่ำกว่า Min Stock
  4. จำนวน SKU ใกล้หมดอายุ (7 วัน)
  5. มูลค่าการรับเข้า (เดือนนี้)
  6. มูลค่าการเบิกใช้ (เดือนนี้)
  7. มูลค่าการสูญเสีย (เดือนนี้)
  8. จำนวน Requisitions รอ approve
  9. จำนวน Transfers in-transit
  10. จำนวน Damage reports รอ approve
- **4 Graphs (Recharts):**
  1. Trend: มูลค่าสต๊อก (รายวัน 30 วัน)
  2. Trend: รับเข้า vs เบิกใช้ (รายสัปดาห์ 12 สัปดาห์)
  3. Trend: การสูญเสีย (รายเดือน 6 เดือน)
  4. Pie: สัดส่วนมูลค่าสต๊อกตามหมวดหมู่
- **Filters:** branch, warehouse, date range
- **Role:** HR/Admin read-write; CEO read-only
- **Acceptance:** CEO เปิด dashboard → เห็น KPI + graphs update real-time

---

### Phase 12: Reports (T146–T148)

**T146** — Core Reports (Stock + Inbound + Requisition)  
**Agent:** Codex  
**Depends:** T138, T145  
**Priority:** P2

**Goal:** 3 รายงานหลัก — Stock On Hand, Inbound, Requisition.

**Deliverables:**
- **Route:** `/admin/inventory/reports` — report hub
- **3 Reports:**
  1. **Stock On Hand Report:** ยอดคงเหลือปัจจุบัน (SKU, warehouse, qty, value, last movement)
  2. **Inbound Report:** รายการรับเข้าตามช่วงเวลา (date, supplier, SKU, qty, cost, lot)
  3. **Requisition Report:** รายการเบิก (date, requester, SKU, qty_requested, qty_issued, status)
- **Filters:** date range, branch, warehouse, SKU, supplier
- **Export:** Excel, CSV, PDF (use `jspdf` + `xlsx`)
- **Acceptance:** HR export Stock On Hand Report (Excel) → ไฟล์มี 50 SKU + ยอดคงเหลือถูกต้อง

---

**T147** — Movement Reports (Consumption, Damage, Transfer)  
**Agent:** Codex  
**Depends:** T140, T143, T146  
**Priority:** P2

**Goal:** 3 รายงานการเคลื่อนไหว — Consumption, Damage, Transfer.

**Deliverables:**
- **3 Reports:**
  1. **Consumption Report:** การใช้จริง (date, SKU, qty, consumption_type, recorded_by)
  2. **Damage Report:** การสูญเสีย (date, SKU, qty, damage_type, reason, value, status, approver)
  3. **Transfer Report:** การโอน (date, from_branch, to_branch, SKU, qty_sent, qty_received, status)
- **Filters:** date range, branch, SKU, type
- **Summary row:** total qty, total value
- **Export:** Excel, CSV, PDF
- **Acceptance:** HR export Damage Report (6 เดือน) → แยกตาม damage_type + มูลค่ารวม

---

**T148** — Analysis Reports (Stock Count Variance + Audit Trail)  
**Agent:** Codex  
**Depends:** T141, T147  
**Priority:** P2

**Goal:** 2 รายงานวิเคราะห์ — Stock Count Variance, Audit Trail.

**Deliverables:**
- **2 Reports:**
  1. **Stock Count Variance Report:** ส่วนต่างตรวจนับ (count_date, SKU, system_qty, physical_qty, variance, variance_value)
  2. **Audit Trail Report:** ประวัติการเปลี่ยนแปลงทั้งหมด (date, user, action, SKU, qty, before, after, movement_type)
- **Filters:** date range, branch, SKU, user, movement_type
- **Export:** Excel, CSV, PDF
- **Acceptance:** Admin export Audit Trail (1 เดือน) → แสดงทุก movement (inbound, requisition, consumption, damage, transfer, adjustment)

---

### Phase 13: Mobile/PDA Enhancements (T149)

**T149** — Mobile Use Case Expansion  
**Agent:** Codex  
**Depends:** T139, T142  
**Priority:** P3 (optional)

**Goal:** ขยายการใช้งานมือถือ — requisition, damage photo, transfer receive.

**Deliverables:**
- Mobile routes:
  - `/m/inventory/requisition/[id]/receive` — ครัวยืนยันรับของ
  - `/m/inventory/damage/create` — ถ่ายรูป + บันทึกชำรุด
  - `/m/inventory/transfer/[id]/receive` — รับสินค้าโอน
- Barcode scan integration (all mobile routes)
- Photo capture (camera API)
- Acceptance: เจ้าหน้าที่ใช้มือถือครบ 5 use cases (inbound, requisition, count, damage, transfer)

---

## Taskmaster Commands (for Codex)

### Add all tasks to Taskmaster:

```bash
cd /Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client

# T136
task-master add-task --prompt="T136 — Unit Conversion Runtime Logic: Implement runtime unit conversion for stock operations (inbound, requisition, consumption, transfer). Server actions convertQuantity(). Allow receiving in secondary unit. Acceptance: create SKU with 2 units → receive 1 ลัง (12 ชิ้น) → stock +12 ชิ้น." --dependencies=135 --priority=high

# T137
task-master add-task --prompt="T137 — BOM Consumption Logic (P2): Auto-deduct stock based on BOM when recording sales/production. Server action consumeByRecipe(). UI option ตัดตามสูตร vs ตัดแบบกำหนดเอง. Acceptance: sell 10 ก๋วยเตี๋ยว → stock auto-deducts per BOM." --dependencies=136,140 --priority=medium

# T138
task-master add-task --prompt="T138 — Kitchen Requisition Web Admin: 4-step workflow (request → approve → issue → receive). Schema inv_requisitions, inv_requisition_items. Routes /admin/inventory/requisition. Stock impact when issue. Acceptance: ครัวสร้างใบ → HR approve → คลังจ่าย → stock ลด." --dependencies=136 --priority=high

# T139
task-master add-task --prompt="T139 — Requisition Mobile View (P3): หัวหน้าครัวสร้างใบเบิกผ่านมือถือ (responsive web). Barcode scan to add SKU. Acceptance: สร้างใบจากมือถือ → HR approve." --dependencies=138 --priority=low

# T140
task-master add-task --prompt="T140 — Consumption & Damage Tracking: แยกรายงานการใช้จริง (inv_consumptions) vs การสูญเสีย (inv_damages). Approval flow by value. Photo upload. Routes /admin/inventory/consumption, /admin/inventory/damage. Acceptance: บันทึกใช้จริง 10kg → stock ลด; บันทึกชำรุด 5kg + photo → approve → stock ลด." --dependencies=136 --priority=high

# T141
task-master add-task --prompt="T141 — Stock Count Plan & Execution: ตรวจนับสต๊อก → เปรียบเทียบยอด → สร้าง Adjustment. Schema inv_stock_counts, inv_stock_count_items. Routes /admin/inventory/stock-count. Variance report. Acceptance: สร้างแผน → นับ 50 SKU → 3 variance → adjustment auto." --dependencies=136 --priority=high

# T142
task-master add-task --prompt="T142 — Stock Count Mobile Interface (P2): Mobile counting UI + barcode scan. Route /m/inventory/count/[countId]. Acceptance: สแกน → นับ → save → physical_qty update." --dependencies=141 --priority=medium

# T143
task-master add-task --prompt="T143 — Branch-to-Branch Transfer: โอนสินค้าระหว่างสาขา. Schema inv_transfers, inv_transfer_items. Routes /admin/inventory/transfer. Flow: send → stock source ลด → receive → stock destination เพิ่ม. Acceptance: สาขา A โอน 20kg → B รับ 19kg → stock A -20, B +19." --dependencies=136 --priority=high

# T144
task-master add-task --prompt="T144 — Inventory Alerts (P2): แจ้งเตือนสินค้าใกล้หมดอายุ / ต่ำกว่า Min Stock / รายการผิดปกติ. Route /admin/inventory/alerts. 3 types: expiry, low stock, anomaly. Badge บน sidebar. Acceptance: Lot หมดอายุ 5 วัน → แสดง alert; SKU < min → alert; Damage > 5% → anomaly." --dependencies=140,141 --priority=medium

# T145
task-master add-task --prompt="T145 — Executive Dashboard KPIs & Graphs: ขยาย Dashboard จาก 3 widgets → 10 KPIs + 4 graphs. Route /admin/inventory/dashboard. KPIs: มูลค่าสต๊อก, SKU ต่ำกว่า Min, ใกล้หมดอายุ, รับเข้า, เบิก, สูญเสีย, รอ approve. Graphs: trend สต๊อก, รับ vs เบิก, สูญเสีย, pie หมวดหมู่. Acceptance: CEO เปิด → เห็น KPI + graphs." --dependencies=140,143,144 --priority=high

# T146
task-master add-task --prompt="T146 — Core Reports (Stock + Inbound + Requisition, P2): 3 รายงานหลัก. Route /admin/inventory/reports. Reports: Stock On Hand, Inbound, Requisition. Filters + Export Excel/CSV/PDF. Acceptance: HR export Stock On Hand (Excel) → 50 SKU + ยอดถูกต้อง." --dependencies=138,145 --priority=medium

# T147
task-master add-task --prompt="T147 — Movement Reports (Consumption, Damage, Transfer, P2): 3 รายงานการเคลื่อนไหว. Reports: Consumption, Damage, Transfer. Filters + Export. Summary row. Acceptance: HR export Damage (6 เดือน) → แยกตาม type + มูลค่ารวม." --dependencies=140,143,146 --priority=medium

# T148
task-master add-task --prompt="T148 — Analysis Reports (Stock Count Variance + Audit Trail, P2): 2 รายงานวิเคราะห์. Reports: Variance, Audit Trail. Filters + Export. Acceptance: Admin export Audit Trail (1 เดือน) → ทุก movement." --dependencies=141,147 --priority=medium

# T149
task-master add-task --prompt="T149 — Mobile Use Case Expansion (P3): ขยายมือถือ — requisition receive, damage photo, transfer receive. Routes /m/inventory/*. Barcode + camera. Acceptance: ใช้มือถือครบ 5 use cases." --dependencies=139,142 --priority=low
```

---

## Linear Sync

After adding tasks to Taskmaster, sync to Linear:

```bash
# Use Linear MCP (preferred)
# Linear MCP tools:
# - list_issues: query=[HRP] project="LINE OA HR & Payroll"
# - save_issue: title, description, state=Todo, project
# - save_comment: issue ID + body

# For each task T136-T149:
# 1. Create Linear issue: title="[HRP] T{N} — {title}", project="LINE OA HR & Payroll", state=Todo
# 2. Link in Taskmaster: task-master update-task {N} --prompt="Linear: JAK-XXX"
```

**Linear Project:** `LINE OA HR & Payroll`  
**Milestone:** M43 Inventory (existing) or create M44 Inventory Expansion

---

## Codex Dispatch Template

When ready to start (after Cursor sets T136 as CURRENT_TASK):

```
อ่าน skills ต่อไปนี้ก่อนเริ่มทำงาน:
- /Users/jakarinosk/HEAD-OFFICE/orchestration/workflow-skills/03-codex-plan/SKILL.md
- /Users/jakarinosk/HEAD-OFFICE/orchestration/workflow-skills/05-codex-execute/SKILL.md

จากนั้นอ่าน:
- /Users/jakarinosk/HEAD-OFFICE/COMPANY_OS.md
- /Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/GROUND_TRUTH.md
- /Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/orchestration/CURRENT_TASK.md
- /Users/jakarinosk/HEAD-OFFICE/PROJECTS/hr-payroll-client/hr-app/reports/INVENTORY_EXPANSION_PLAN.md

**IMPORTANT — Agent Team Strategy:**

สำหรับ tasks ที่มีความซับซ้อน (เช่น T136, T138, T140, T141, T143, T145) ให้ใช้ Task tool สร้าง agent team มาช่วยทำงานแบบ parallel:

**Agent Team Roles:**
1. **Schema Agent (best-of-n-runner):** ออกแบบ + เขียน migration SQL
2. **API Agent (best-of-n-runner):** สร้าง server actions + validation logic
3. **UI Agent (best-of-n-runner):** สร้าง routes + components + forms
4. **Test Agent (generalPurpose):** เขียน acceptance tests

**Workflow:**
1. PLAN phase: วางแผนแบ่งงานให้ agent team (ใช้ Task tool spawn 2-4 agents parallel)
2. รอ agents เสร็จ → รวมผลลัพธ์
3. Integration test + quality gates
4. เขียน TASK_RESULT.md

**Example Dispatch (T136 Unit Conversion):**
```
Task tool spawn parallel:
- Agent 1 (schema): migration สำหรับ inv_unit_conversions table
- Agent 2 (API): convertQuantity() server action
- Agent 3 (UI): unit selector dropdown + conversion display
- Agent 4 (test): acceptance test — receive 1 ลัง → +12 ชิ้น
```

ใช้ best-of-n-runner สำหรับ isolated work, generalPurpose สำหรับ complex integration

เริ่ม PLAN phase ตาม skill 03 — อย่าลืมวางแผน agent team strategy ใน plan
```

---

## Quality Gates (ทุก task)

```bash
cd hr-app
npm run build        # must pass
npm run typecheck    # must pass
npm run lint         # 0 errors
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| 14 tasks = long timeline | ลำดับความสำคัญ P1 → P2 → P3; P3 ทำได้ทีหลัง |
| Complex dependencies | Taskmaster graph validates; Codex ทำตาม depends ใน plan |
| RLS ซับซ้อน (5 roles) | ใช้ pattern จาก T130–135; test แต่ละ role |
| Stock balance integrity | ทุก movement ต้องผ่าน `inv_stock_movements` + audit |
| Unit conversion bugs | T136 ต้อง test ครบทุกหน่วย; edge case (ลัง → กรัม) |
| Mobile performance | LIFF page ใช้ pagination; ไม่ load 1000+ SKU ครั้งเดียว |

---

## Success Metrics

- ✅ 100% PRD coverage (10 modules ครบ)
- ✅ ทุก task ผ่าน quality gates
- ✅ Linear synced (T136-T149 state = Done)
- ✅ Smoke test: HR ทำ end-to-end flow (inbound → requisition → consumption → stock count → transfer) ไม่มี console error
- ✅ CEO เปิด Dashboard → เห็น KPI + graphs ครบ

---

## Next Steps (for Cursor)

1. **Add tasks:** รัน command ด้านบน (T136-T149)
2. **Sync Linear:** create issues `[HRP] T136`–`T149` via Linear MCP
3. **Set T136:** `task-master set-status --id=136 --status=in-progress`
4. **Write CURRENT_TASK.md:** T136 — Unit Conversion Runtime Logic
5. **Dispatch Codex:** ใช้ template ด้านบน
6. **Review loop:** PLAN → approve → EXECUTE → review → next task

---

*Created: 2026-06-13*  
*Owner: Cursor orchestrator*  
*Target agent: Codex*
