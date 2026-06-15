export type InvSku = {
  id: string
  code: string
  name: string
  category: string | null
  unit_id: string | null
  barcode: string | null
  min_stock: number
  max_stock: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvSupplier = {
  id: string
  code: string
  name: string
  address: string | null
  contact: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvBranch = {
  id: string
  code: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvWarehouse = {
  id: string
  code: string
  name: string
  branch_id: string
  type: "main" | "sub"
  is_active: boolean
  created_at: string
  updated_at: string
}

export type InvWarehouseWithBranch = InvWarehouse & {
  inv_branches: { name: string } | { name: string }[] | null
}

export type InvUnit = {
  id: string
  name: string
  abbreviation: string | null
}

export type InventoryActionState = {
  success: boolean
  error?: string
  id?: string
}

export type InventoryMultiActionState = InventoryActionState & {
  ids?: string[]
  statuses?: InvDamageStatus[]
  autoApproved?: boolean
  autoApprovedCount?: number
  pendingCount?: number
}

export type InvInboundStatus = "draft" | "pending" | "approved" | "cancelled"

export type InvInboundOrder = {
  id: string
  supplier_id: string | null
  warehouse_id: string | null
  status: InvInboundStatus
  received_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type InvInboundOrderRow = InvInboundOrder & {
  supplier_name: string
  warehouse_name: string
  item_count: number
}

export type InvInboundItem = {
  id: string
  inbound_order_id: string
  sku_id: string | null
  quantity: number
  cost_per_unit: number | null
  lot_number: string | null
  expiry_date: string | null
  created_at: string
}

export type InvInboundItemRow = InvInboundItem & {
  sku_code: string
  sku_name: string
}

export type InvRequisitionStatus =
  | "draft"
  | "pending"
  | "approved"
  | "issued"
  | "completed"
  | "rejected"

export type InvRequisition = {
  id: string
  branch_id: string
  warehouse_id: string
  requester_id: string
  status: InvRequisitionStatus
  notes: string | null
  rejection_reason: string | null
  approved_by: string | null
  approved_at: string | null
  issued_by: string | null
  issued_at: string | null
  received_by: string | null
  received_at: string | null
  created_at: string
  updated_at: string
}

export type InvRequisitionItem = {
  id: string
  requisition_id: string
  sku_id: string
  qty_requested: number
  qty_approved: number
  qty_issued: number
  qty_received: number
  lot_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvRequisitionRow = InvRequisition & {
  branch_name: string
  warehouse_name: string
  requester_name: string
  item_count: number
}

export type InvRequisitionItemRow = InvRequisitionItem & {
  sku_code: string
  sku_name: string
  unit_name: string | null
  unit_abbreviation: string | null
}

export type InvRequisitionDetail = {
  requisition: InvRequisition
  branch_name: string
  warehouse_name: string
  requester_name: string
  approved_by_name: string | null
  issued_by_name: string | null
  received_by_name: string | null
  items: InvRequisitionItemRow[]
}

export type InvRequisitionCreateOptions = {
  branches: InvBranch[]
  warehouses: Array<InvWarehouse & { branch_name: string }>
  skus: Array<InvSku & { unit_name: string | null; unit_abbreviation: string | null }>
}

export type InvConsumptionType = "production" | "sampling" | "testing"

export type InvDamageType =
  | "damaged"
  | "spoiled"
  | "expired"
  | "lost"
  | "adjustment"

export type InvDamageStatus = "pending" | "approved" | "rejected"

export type InvDamageApprovalRole = "auto" | "hr" | "inventory"

export type InvConsumption = {
  id: string
  branch_id: string
  warehouse_id: string
  sku_id: string
  qty: number
  consumption_type: InvConsumptionType
  recorded_by: string
  recorded_at: string
  notes: string | null
  created_at: string
}

export type InvDamage = {
  id: string
  branch_id: string
  warehouse_id: string
  sku_id: string
  qty: number
  damage_type: InvDamageType
  reason: string
  photo_url: string | null
  status: InvDamageStatus
  cost_value: number
  approval_required_role: InvDamageApprovalRole
  auto_approved: boolean
  approver_id: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
  notes: string | null
}

export type InvInventoryCreateOptions = {
  branches: InvBranch[]
  warehouses: Array<InvWarehouse & { branch_name: string }>
  skus: Array<
    InvSku & {
      unit_name: string | null
      unit_abbreviation: string | null
      latest_cost: number | null
    }
  >
}

export type InvDamageRow = InvDamage & {
  branch_name: string
  warehouse_name: string
  sku_code: string
  sku_name: string
  unit_name: string | null
  unit_abbreviation: string | null
  created_by_name: string
  approver_name: string | null
}

export type InvDamageDetail = InvDamageRow & {
  photo_signed_url: string | null
}

export type InvStockCountScope = "all" | "category" | "sku"

export type InvStockCountStatus = "draft" | "counting" | "completed" | "cancelled"

export type InvStockCount = {
  id: string
  branch_id: string
  warehouse_id: string
  scope: InvStockCountScope
  status: InvStockCountStatus
  planned_at: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvStockCountItem = {
  id: string
  count_id: string
  sku_id: string
  system_qty: number
  physical_qty: number | null
  lot_number: string | null
  counted_by: string | null
  counted_at: string | null
  created_at: string
  updated_at: string
}

export type InvStockAdjustmentStatus = "pending" | "applied"

export type InvStockAdjustment = {
  id: string
  count_id: string | null
  warehouse_id: string
  sku_id: string
  qty_delta: number
  reason: string | null
  status: InvStockAdjustmentStatus
  created_by: string
  applied_at: string | null
  created_at: string
  updated_at: string
}

export type InvTransferStatus = "draft" | "in_transit" | "received" | "cancelled"

export type InvTransfer = {
  id: string
  from_warehouse_id: string
  to_warehouse_id: string
  from_branch_id: string
  to_branch_id: string
  status: InvTransferStatus
  shipper: string | null
  created_by: string
  sent_by: string | null
  received_by: string | null
  sent_at: string | null
  received_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvTransferItem = {
  id: string
  transfer_id: string
  sku_id: string
  qty_sent: number
  qty_received: number
  lot_number: string | null
  created_at: string
  updated_at: string
}
