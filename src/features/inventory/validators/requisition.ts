import { z } from "zod"

const optionalText = (max = 2000) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }, z.string().max(max).nullable().optional())

export const invRequisitionIdSchema = z.string().uuid("ไม่พบใบเบิก")

export const invRequisitionCreateItemSchema = z.object({
  sku_id: z.string().uuid("เลือก SKU"),
  qty_requested: z.coerce.number().positive("จำนวนที่ขอต้องมากกว่า 0"),
  notes: optionalText(1000),
})

export const invRequisitionCreateSchema = z.object({
  branch_id: z.string().uuid("เลือกสาขา"),
  warehouse_id: z.string().uuid("เลือกคลังสินค้า"),
  notes: optionalText(2000),
  items: z
    .array(invRequisitionCreateItemSchema)
    .min(1, "เพิ่มรายการอย่างน้อย 1 รายการ"),
})

export const invRequisitionApproveItemSchema = z.object({
  id: z.string().uuid("ไม่พบรายการ"),
  qty_approved: z.coerce.number().min(0, "จำนวนอนุมัติต้องไม่ติดลบ"),
})

export const invRequisitionApproveSchema = z.object({
  id: invRequisitionIdSchema,
  items: z
    .array(invRequisitionApproveItemSchema)
    .min(1, "ต้องมีรายการอนุมัติ"),
})

export const invRequisitionRejectSchema = z.object({
  id: invRequisitionIdSchema,
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(2000),
})

export const invRequisitionIssueItemSchema = z.object({
  id: z.string().uuid("ไม่พบรายการ"),
  qty_issued: z.coerce.number().positive("จำนวนจ่ายต้องมากกว่า 0"),
  lot_number: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  override_reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})

export const invRequisitionIssueSchema = z.object({
  id: invRequisitionIdSchema,
  items: z
    .array(invRequisitionIssueItemSchema)
    .min(1, "ต้องมีรายการจ่ายสินค้า"),
})

export const invRequisitionReceiveItemSchema = z.object({
  id: z.string().uuid("ไม่พบรายการ"),
  qty_received: z.coerce.number().min(0, "จำนวนรับต้องไม่ติดลบ"),
})

export const invRequisitionReceiveSchema = z.object({
  id: invRequisitionIdSchema,
  items: z
    .array(invRequisitionReceiveItemSchema)
    .min(1, "ต้องมีรายการรับสินค้า"),
})

export type InvRequisitionCreateInput = z.infer<
  typeof invRequisitionCreateSchema
>
export type InvRequisitionApproveInput = z.infer<
  typeof invRequisitionApproveSchema
>
export type InvRequisitionRejectInput = z.infer<
  typeof invRequisitionRejectSchema
>
export type InvRequisitionIssueInput = z.infer<typeof invRequisitionIssueSchema>
export type InvRequisitionReceiveInput = z.infer<
  typeof invRequisitionReceiveSchema
>
