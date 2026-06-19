export type InventoryGuideStep = {
  id: string
  title: string
  body: string
  /** หน้าที่ควรอยู่ตอนขั้นนี้ */
  href: string
  /** data-inventory-guide บน UI */
  target?: string
  /** ขั้นตั้งค่าข้อมูลหลัก — ซ่อนใน staff mode */
  masterData?: boolean
}

export const INVENTORY_GUIDE_STEPS: InventoryGuideStep[] = [
  {
    id: "welcome",
    title: "ยินดีต้อนรับสู่คลังสินค้า",
    body: "โหมดแนะนำจะพาคุณทำความเข้าใจเมนูและลำดับงานคลังตั้งแต่ตั้งค่าข้อมูลหลักจนถึงรายงาน — กดถัดไปเพื่อเริ่ม",
    href: "/admin/inventory",
    target: "hub-intro",
  },
  {
    id: "subnav",
    title: "เมนูคลังด้านบน",
    body: "แถบเมนูนี้ใช้สลับหน้างานได้ตลอด — ปุ่มสีแดงคือหน้าที่คุณอยู่ งานประจำวันอยู่ด้านซ้าย ข้อมูลหลักอยู่ด้านขวา (ถ้ามีสิทธิ์)",
    href: "/admin/inventory",
    target: "subnav",
  },
  {
    id: "sku",
    title: "ขั้นที่ 1 — สร้าง SKU",
    body: "กำหนดรหัสสินค้า หน่วยนับ Min/Max และหมวดหมู่ก่อนรับเข้าหรือเบิก — ทุกรายการสต็อกอ้างอิงจาก SKU",
    href: "/admin/inventory/sku",
    target: "nav-sku",
    masterData: true,
  },
  {
    id: "supplier",
    title: "ขั้นที่ 2 — Supplier",
    body: "ลงทะเบียนผู้จำหน่ายที่ใช้ในใบรับเข้า — ช่วยติดตามแหล่งที่มาและอ้างอิงตอนสั่งซื้อ",
    href: "/admin/inventory/suppliers",
    target: "nav-suppliers",
    masterData: true,
  },
  {
    id: "branch",
    title: "ขั้นที่ 3 — สาขา (คลัง)",
    body: "สาขาคลังแยกจากสาขา HR — ผูกคลังย่อยและสต็อกตามสาขาธุรกิจ",
    href: "/admin/inventory/branches",
    target: "nav-branches",
    masterData: true,
  },
  {
    id: "warehouse",
    title: "ขั้นที่ 4 — คลังสินค้า",
    body: "สร้างคลังย่อยในแต่ละสาขา (เช่น คลังหลัก / คลังเย็น) — สต็อกและ FEFO แยกตามคลัง",
    href: "/admin/inventory/warehouses",
    target: "nav-warehouses",
    masterData: true,
  },
  {
    id: "inbound",
    title: "ขั้นที่ 5 — รับเข้า",
    body: "สร้างใบรับเข้า → สแกน LIFF รับของจริง → อนุมัติแล้วยอดเข้าสต็อกตามล็อต (FEFO)",
    href: "/admin/inventory/inbound",
    target: "nav-inbound",
  },
  {
    id: "stock",
    title: "ขั้นที่ 6 — ดูสต็อก",
    body: "ตรวจคงเหลือตามคลัง สาขา และล็อต — ใช้ก่อนเบิกหรือโอนเพื่อยืนยันว่ามีของพอ",
    href: "/admin/inventory/stock",
    target: "nav-stock",
  },
  {
    id: "requisition",
    title: "ขั้นที่ 7 — ใบเบิก",
    body: "เบิกวัตถุดิบออกจากคลัง — ระบบแนะนำล็อต FEFO ก่อน แล้วรับของที่ปลายทางผ่าน LIFF",
    href: "/admin/inventory/requisition",
    target: "nav-requisition",
  },
  {
    id: "transfer",
    title: "ขั้นที่ 8 — โอนสินค้า",
    body: "ย้ายสต็อกระหว่างคลังหรือสาขา — สร้างใบโอน ส่งของ แล้วรับยืนยันที่ปลายทาง",
    href: "/admin/inventory/transfer",
    target: "nav-transfer",
  },
  {
    id: "stock-count",
    title: "ขั้นที่ 9 — ตรวจนับสต็อก",
    body: "นับจริงเทียบยอดระบบ — ปรับ variance หลังอนุมัติเพื่อให้สต็อกตรงกับของจริง",
    href: "/admin/inventory/stock-count",
    target: "nav-stock-count",
  },
  {
    id: "consumption",
    title: "ขั้นที่ 10 — บันทึกใช้จริง",
    body: "บันทึกการใช้งานจริงหลังเบิกหรือใช้ในครัว — ช่วยรายงานต้นทุนและปริมาณใช้",
    href: "/admin/inventory/consumption",
    target: "nav-consumption",
  },
  {
    id: "damage",
    title: "ขั้นที่ 11 — แจ้งเสียหาย",
    body: "บันทึกของเสียหายหรือสูญหาย — หักออกจากสต็อกพร้อมเหตุผลเพื่อ audit",
    href: "/admin/inventory/damage",
    target: "nav-damage",
  },
  {
    id: "reports",
    title: "ขั้นที่ 12 — รายงาน & Alerts",
    body: "ดูรายงาน inbound / เบิก / โอน / variance และ Alerts สต็อกต่ำ — ใช้ตรวจสอบหลังปิดงานประจำวัน",
    href: "/admin/inventory/reports",
    target: "nav-reports",
  },
  {
    id: "complete",
    title: "จบกระบวนการแนะนำ",
    body: "คุณครบทุกขั้นตอนหลักแล้ว — เปิดแดชบอร์ดเพื่อภาพรวม KPI หรือปิดโหมดแนะนำได้ตลอดจากปุ่มด้านบน",
    href: "/admin/inventory/dashboard",
    target: "nav-dashboard",
  },
]

export function filterGuideSteps(
  steps: InventoryGuideStep[],
  options: { staffMode: boolean; showMasterData: boolean }
): InventoryGuideStep[] {
  if (options.staffMode && !options.showMasterData) {
    return steps.filter((step) => !step.masterData)
  }
  return steps
}

export function stepIndexForPath(
  steps: InventoryGuideStep[],
  pathname: string
): number {
  const exact = steps.findIndex((step) => step.href === pathname)
  if (exact >= 0) return exact

  let best = -1
  let bestLen = 0
  steps.forEach((step, index) => {
    if (
      pathname === step.href ||
      (pathname.startsWith(`${step.href}/`) && step.href.length > bestLen)
    ) {
      best = index
      bestLen = step.href.length
    }
  })
  return best
}
