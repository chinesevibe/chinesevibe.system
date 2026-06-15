import {
  ictToday,
  ONBOARDING_PENDING_OR_FILTER,
} from "@/features/employees/data"
import { DOC_TYPE_LABELS } from "@/features/documents/types"
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import type {
  NotificationInbox,
  NotificationItem,
  NotificationKind,
} from "@/features/notifications/types"
import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/types"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import {
  buildBranchNavBadges,
  buildHrNavBadges,
  buildInventoryNavBadges,
  type HrApprovalCounts,
} from "@/features/notifications/nav-badges"
import type { DevViewAs } from "@/lib/auth/dev-view"
import { getManagedBranchId } from "@/lib/auth/branch"
import { canManageHr, isInventoryPortalUser } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"
import {
  EMPLOYEE_VIA_ATTENDANCE_SUBMISSION,
  EMPLOYEE_VIA_LEAVE,
  EMPLOYEE_VIA_OVERTIME,
} from "@/lib/supabase/employee-embeds"
import { createClient } from "@/lib/supabase/server"

const DAY_MS = 86_400_000
const COMPLIANCE_WINDOW_DAYS = 60
const COMPLIANCE_URGENT_DAYS = 14
const LIST_LIMIT = NOTIFICATION_LIST_LIMIT

const KIND_ORDER: Record<NotificationKind, number> = {
  registration: 0,
  onboarding: 0,
  leave: 1,
  attendance: 2,
  overtime: 3,
  document: 4,
  complaint: 5,
  probation: 6,
  visa: 7,
  work_permit: 8,
  inbound: 1,
  requisition: 2,
  damage: 3,
  low_stock: 4,
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  )
}

function employeeName(
  joined: { name: string } | Array<{ name: string }> | null | undefined
): string {
  if (!joined) return "—"
  return Array.isArray(joined) ? joined[0].name : joined.name
}

function notificationTime(iso: string | null): number {
  if (!iso) return 0
  const normalized = iso.includes("T") ? iso : `${iso}T12:00:00Z`
  const t = Date.parse(normalized)
  return Number.isNaN(t) ? 0 : t
}

/** Newest first — used for the bell dropdown (max 10 latest). */
function sortItemsByRecency(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => {
    const timeDiff = notificationTime(b.createdAt) - notificationTime(a.createdAt)
    if (timeDiff !== 0) return timeDiff
    if (a.urgency !== b.urgency) return a.urgency === "urgent" ? -1 : 1
    return KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  })
}

async function complianceNotifications(
  today: string,
  windowEnd: string
): Promise<{ items: NotificationItem[]; total: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name, department, probation_end, visa_expiry, work_permit_expiry")
    .eq("status", "active")

  if (error) throw error

  const items: NotificationItem[] = []
  let total = 0

  const pushCompliance = (
    kind: "probation" | "visa" | "work_permit",
    employeeId: string,
    name: string,
    department: string | null,
    dueDate: string
  ) => {
    if (dueDate < today || dueDate > windowEnd) return
    total += 1
    const daysLeft = daysBetween(today, dueDate)
    const urgency = daysLeft <= COMPLIANCE_URGENT_DAYS ? "urgent" : "normal"
    const title =
      kind === "probation"
        ? "ทดลองงานใกล้ครบ"
        : kind === "visa"
          ? "วีซ่าใกล้หมดอายุ"
          : "Work Permit ใกล้หมดอายุ"
    items.push({
      id: `${kind}-${employeeId}`,
      kind,
      title,
      summary: `${name}${department ? ` · ${department}` : ""} — เหลือ ${daysLeft} วัน (${dueDate})`,
      href: `/admin/employees/${employeeId}`,
      createdAt: dueDate,
      urgency,
    })
  }

  for (const row of data ?? []) {
    if (row.probation_end) {
      pushCompliance(
        "probation",
        row.id,
        row.name,
        row.department,
        row.probation_end as string
      )
    }
    if (row.visa_expiry) {
      pushCompliance("visa", row.id, row.name, row.department, row.visa_expiry as string)
    }
    if (row.work_permit_expiry) {
      pushCompliance(
        "work_permit",
        row.id,
        row.name,
        row.department,
        row.work_permit_expiry as string
      )
    }
  }

  return { items: sortItemsByRecency(items), total }
}

async function hrApprovalNotifications(): Promise<{
  items: NotificationItem[]
  total: number
  counts: HrApprovalCounts
}> {
  const supabase = await createClient()
  const [
    onboardingRes,
    registrationCountRes,
    onboardingCountRes,
    leavePendingRes,
    leavePendingCountRes,
    leaveHrCountRes,
    attRes,
    attCountRes,
    otRes,
    otCountRes,
    docRes,
    docCountRes,
    complaintRes,
    complaintCountRes,
  ] = await Promise.all([
    supabase
      .from("hr_employees")
      .select(
        `id, employee_code, name, phone, status, branch_id, created_at, ${BRANCH_VIA_EMPLOYEE}(name)`
      )
      .or(ONBOARDING_PENDING_OR_FILTER)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "inactive")
      .eq("role", "employee"),
    supabase
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("role", "employee")
      .is("branch_id", null),
    supabase
      .from("hr_leaves")
      .select(
        "id, type, start_date, end_date, created_at, approval_status, hr_employees!employee_id(name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_leaves")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("hr_leaves")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_attendance_submissions")
      .select(
        "id, work_date, submitted_at, hr_employees!employee_id(name)"
      )
      .eq("approval_status", "pending_hr")
      .order("submitted_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_attendance_submissions")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_overtime_requests")
      .select(
        "id, work_date, start_time, end_time, submitted_at, hr_employees!employee_id(name)"
      )
      .eq("approval_status", "pending_hr")
      .order("submitted_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_overtime_requests")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending_hr"),
    supabase
      .from("hr_document_requests")
      .select(
        "id, doc_type, purpose, created_at, hr_employees!inner(name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_document_requests")
      .select("id, hr_employees!inner(id)", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("hr_complaints")
      .select("id, ticket_code, subject, created_at, hr_employees(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("hr_complaints")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ])

  const items: NotificationItem[] = []

  for (const row of onboardingRes.data ?? []) {
    const branch = Array.isArray(row.hr_branches)
      ? row.hr_branches[0]
      : row.hr_branches
    const pendingRegistration = row.status === "inactive"
    const needsBranch = row.status === "active" && row.branch_id === null
    items.push({
      id: `${pendingRegistration ? "registration" : "onboarding"}-${row.id}`,
      kind: pendingRegistration ? "registration" : "onboarding",
      title: pendingRegistration ? "ลงทะเบียนใหม่" : "รอกำหนดสาขา",
      summary: [
        row.employee_code as string | null,
        row.name,
        branch?.name,
        row.phone,
        needsBranch ? "ยังไม่กำหนดสาขา" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/employees/${row.id}`,
      createdAt: row.created_at as string | null,
      urgency: pendingRegistration ? "urgent" : "normal",
    })
  }

  for (const row of leavePendingRes.data ?? []) {
    const typeLabel =
      LEAVE_TYPE_LABELS[row.type as LeaveType] ?? row.type
    const approvalStatus = row.approval_status as string | null
    items.push({
      id: `leave-${row.id}`,
      kind: "leave",
      title:
        approvalStatus === "pending_manager"
          ? "ขอลารอ BM อนุมัติ"
          : approvalStatus === "pending_hr"
            ? "ขอลารอ HR อนุมัติ"
            : "ขอลารออนุมัติ",
      summary: `${employeeName(row.hr_employees)} · ${typeLabel} ${row.start_date}–${row.end_date}`,
      href: "/admin/leaves?status=pending",
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of attRes.data ?? []) {
    items.push({
      id: `attendance-${row.id}`,
      kind: "attendance",
      title: "ส่งเวลางานรอ HR อนุมัติ",
      summary: `${employeeName(row.hr_employees)} · วันที่ ${row.work_date}`,
      href: "/admin/attendance",
      createdAt: row.submitted_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of otRes.data ?? []) {
    items.push({
      id: `overtime-${row.id}`,
      kind: "overtime",
      title: "ขอ OT รออนุมัติ",
      summary: `${employeeName(row.hr_employees)} · ${row.work_date} ${row.start_time}–${row.end_time}`,
      href: "/admin/overtime",
      createdAt: row.submitted_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of docRes.data ?? []) {
    const docLabel =
      DOC_TYPE_LABELS[row.doc_type as keyof typeof DOC_TYPE_LABELS] ?? row.doc_type
    items.push({
      id: `document-${row.id}`,
      kind: "document",
      title: "ขอเอกสารรอดำเนินการ",
      summary: `${employeeName(row.hr_employees)} · ${docLabel}`,
      href: "/admin/documents?status=pending",
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of complaintRes.data ?? []) {
    items.push({
      id: `complaint-${row.id}`,
      kind: "complaint",
      title: "เรื่องร้องเรียนใหม่",
      summary: `${row.ticket_code} · ${row.subject}`,
      href: "/admin/complaints?status=open",
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  const total =
    (registrationCountRes.count ?? 0) +
    (onboardingCountRes.count ?? 0) +
    (leavePendingCountRes.count ?? 0) +
    (attCountRes.count ?? 0) +
    (otCountRes.count ?? 0) +
    (docCountRes.count ?? 0) +
    (complaintCountRes.count ?? 0)

  return {
    items: sortItemsByRecency(items),
    total,
    counts: {
      registration: registrationCountRes.count ?? 0,
      onboarding: onboardingCountRes.count ?? 0,
      leavePending: leavePendingCountRes.count ?? 0,
      leaveHr: leaveHrCountRes.count ?? 0,
      attendance: attCountRes.count ?? 0,
      overtime: otCountRes.count ?? 0,
      document: docCountRes.count ?? 0,
      complaint: complaintCountRes.count ?? 0,
    },
  }
}

async function branchApprovalNotifications(
  caller: Employee
): Promise<{
  items: NotificationItem[]
  total: number
  counts: { leave: number; attendance: number; overtime: number }
}> {
  const branchId = await getManagedBranchId(caller.id)
  if (!branchId) {
    return {
      items: [],
      total: 0,
      counts: { leave: 0, attendance: 0, overtime: 0 },
    }
  }

  const supabase = await createClient()
  const [leaveRes, leaveCountRes, attRes, attCountRes] = await Promise.all([
      supabase
        .from("hr_leaves")
        .select(
          `id, type, start_date, end_date, created_at, ${EMPLOYEE_VIA_LEAVE}(name, branch_id)`
        )
        .eq("approval_status", "pending_manager")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("hr_leaves")
        .select(`id, ${EMPLOYEE_VIA_LEAVE}!inner(branch_id)`, {
          count: "exact",
          head: true,
        })
        .eq("approval_status", "pending_manager")
        .eq("hr_employees.branch_id", branchId),
      supabase
        .from("hr_attendance_submissions")
        .select(
          `id, work_date, submitted_at, ${EMPLOYEE_VIA_ATTENDANCE_SUBMISSION}(name, branch_id)`
        )
        .eq("approval_status", "pending_manager")
        .order("submitted_at", { ascending: false })
        .limit(30),
      supabase
        .from("hr_attendance_submissions")
        .select(`id, ${EMPLOYEE_VIA_ATTENDANCE_SUBMISSION}!inner(branch_id)`, {
          count: "exact",
          head: true,
        })
        .eq("approval_status", "pending_manager")
        .eq("hr_employees.branch_id", branchId),
    ])

  const items: NotificationItem[] = []

  const inBranch = (joined: { branch_id?: string } | Array<{ branch_id?: string }>) => {
    const emp = Array.isArray(joined) ? joined[0] : joined
    return emp?.branch_id === branchId
  }

  for (const row of (leaveRes.data ?? []).filter((r) => inBranch(r.hr_employees))) {
    const typeLabel =
      LEAVE_TYPE_LABELS[row.type as LeaveType] ?? row.type
    items.push({
      id: `leave-${row.id}`,
      kind: "leave",
      title: "ขอลารอ BM อนุมัติ",
      summary: `${employeeName(row.hr_employees)} · ${typeLabel} ${row.start_date}–${row.end_date}`,
      href: "/admin/branch",
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of (attRes.data ?? []).filter((r) => inBranch(r.hr_employees))) {
    items.push({
      id: `attendance-${row.id}`,
      kind: "attendance",
      title: "ส่งเวลางานรอ BM",
      summary: `${employeeName(row.hr_employees)} · วันที่ ${row.work_date}`,
      href: "/admin/branch",
      createdAt: row.submitted_at as string | null,
      urgency: "normal",
    })
  }

  const total =
    (leaveCountRes.count ?? 0) +
    (attCountRes.count ?? 0)

  return {
    items: sortItemsByRecency(items).slice(0, LIST_LIMIT),
    total,
    counts: {
      leave: leaveCountRes.count ?? 0,
      attendance: attCountRes.count ?? 0,
      overtime: 0,
    },
  }
}

export type NotificationScope = "hr" | "branch" | "inventory"

export function resolveNotificationScope(
  caller: Employee,
  devView?: DevViewAs | null
): NotificationScope | null {
  if (caller.role === "dev") {
    if (devView === "branch") return "branch"
    return "hr"
  }
  if (canManageHr(caller.role)) return "hr"
  if (caller.role === "branch_manager") return "branch"
  if (isInventoryPortalUser(caller)) return "inventory"
  return null
}

async function inventoryNotifications(): Promise<{
  items: NotificationItem[]
  total: number
  counts: { inbound: number; requisition: number; damage: number; lowStock: number }
}> {
  const supabase = await createClient()

  const [
    inboundRes,
    inboundCountRes,
    requisitionRes,
    requisitionCountRes,
    approvedReqCountRes,
    damageRes,
    damageCountRes,
    skusRes,
    balancesRes,
  ] = await Promise.all([
    supabase
      .from("inv_inbound_orders")
      .select("id, created_at, inv_suppliers(name), inv_warehouses(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("inv_inbound_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("inv_requisitions")
      .select("id, status, created_at, inv_branches(name)")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("inv_requisitions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("inv_requisitions")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("inv_damages")
      .select("id, damage_type, created_at, inv_skus(code, name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("inv_damages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("inv_skus")
      .select("id, code, name, min_stock")
      .eq("is_active", true),
    supabase.from("inv_stock_balances").select("sku_id, quantity"),
  ])

  const items: NotificationItem[] = []

  for (const row of inboundRes.data ?? []) {
    const supplier = employeeName(
      row.inv_suppliers as { name: string } | Array<{ name: string }> | null
    )
    const warehouse = employeeName(
      row.inv_warehouses as { name: string } | Array<{ name: string }> | null
    )
    items.push({
      id: `inbound-${row.id}`,
      kind: "inbound",
      title: "ใบรับเข้ารออนุมัติ",
      summary: `${supplier} → ${warehouse}`,
      href: `/admin/inventory/inbound/${row.id}`,
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of requisitionRes.data ?? []) {
    const branch = employeeName(
      row.inv_branches as { name: string } | Array<{ name: string }> | null
    )
    const status = row.status as string
    items.push({
      id: `requisition-${row.id}`,
      kind: "requisition",
      title:
        status === "approved" ? "ใบเบิกรอจ่ายสินค้า" : "ใบเบิกรออนุมัติ",
      summary: branch !== "—" ? branch : "ใบเบิกสินค้า",
      href: `/admin/inventory/requisition/${row.id}`,
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  for (const row of damageRes.data ?? []) {
    const skuRaw = row.inv_skus as unknown
    const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
    const sku = skuJoined as { code?: string; name?: string } | null
    items.push({
      id: `damage-${row.id}`,
      kind: "damage",
      title: "แจ้งเสียหายรออนุมัติ",
      summary: sku ? `${sku.code} · ${sku.name}` : "รายการเสียหาย",
      href: `/admin/inventory/damage/${row.id}`,
      createdAt: row.created_at as string | null,
      urgency: "normal",
    })
  }

  const qtyBySku = new Map<string, number>()
  for (const row of balancesRes.data ?? []) {
    const skuId = row.sku_id as string
    const qty = Number(row.quantity)
    qtyBySku.set(skuId, (qtyBySku.get(skuId) ?? 0) + qty)
  }

  let lowStockCount = 0
  for (const sku of skusRes.data ?? []) {
    const id = sku.id as string
    const qty = qtyBySku.get(id) ?? 0
    const minStock = Number(sku.min_stock)
    if (minStock > 0 && qty < minStock) {
      lowStockCount += 1
      if (items.filter((i) => i.kind === "low_stock").length < 3) {
        items.push({
          id: `low-stock-${id}`,
          kind: "low_stock",
          title: "สต็อกต่ำกว่าขั้นต่ำ",
          summary: `${sku.code as string} · ${sku.name as string} (${qty}/${minStock})`,
          href: "/admin/inventory/stock",
          createdAt: null,
          urgency: qty === 0 ? "urgent" : "normal",
        })
      }
    }
  }

  const requisitionTotal =
    (requisitionCountRes.count ?? 0) + (approvedReqCountRes.count ?? 0)
  const inboundTotal = inboundCountRes.count ?? 0
  const damageTotal = damageCountRes.count ?? 0
  const total = inboundTotal + requisitionTotal + damageTotal + lowStockCount

  return {
    items: sortItemsByRecency(items),
    total,
    counts: {
      inbound: inboundTotal,
      requisition: requisitionTotal,
      damage: damageTotal,
      lowStock: lowStockCount,
    },
  }
}

export async function getNotificationInbox(
  caller: Employee,
  scope: NotificationScope
): Promise<NotificationInbox> {
  const today = ictToday()
  const windowEnd = new Date(
    Date.parse(`${today}T00:00:00Z`) + COMPLIANCE_WINDOW_DAYS * DAY_MS
  )
    .toISOString()
    .slice(0, 10)

  if (scope === "branch") {
    const branch = await branchApprovalNotifications(caller)
    return {
      items: branch.items.slice(0, LIST_LIMIT),
      total: branch.total,
      approvalTotal: branch.total,
      complianceTotal: 0,
      navBadges: buildBranchNavBadges({
        attendance: branch.counts.attendance,
        leaves: branch.counts.leave,
        overtime: branch.counts.overtime,
        total: branch.total,
      }),
    }
  }

  if (scope === "inventory") {
    const inventory = await inventoryNotifications()
    return {
      items: inventory.items.slice(0, LIST_LIMIT),
      total: inventory.total,
      approvalTotal: inventory.total,
      complianceTotal: 0,
      navBadges: buildInventoryNavBadges({
        inbound: inventory.counts.inbound,
        requisition: inventory.counts.requisition,
        damage: inventory.counts.damage,
        lowStock: inventory.counts.lowStock,
        total: inventory.total,
      }),
    }
  }

  const [approvals, compliance] = await Promise.all([
    hrApprovalNotifications(),
    complianceNotifications(today, windowEnd),
  ])

  const merged = sortItemsByRecency([
    ...approvals.items,
    ...compliance.items,
  ]).slice(0, LIST_LIMIT)

  return {
    items: merged,
    total: approvals.total + compliance.total,
    approvalTotal: approvals.total,
    complianceTotal: compliance.total,
    navBadges: buildHrNavBadges(approvals.counts, compliance.total),
  }
}

export async function getNotificationCount(
  caller: Employee,
  scope: NotificationScope
): Promise<number> {
  const inbox = await getNotificationInbox(caller, scope)
  return inbox.total
}
