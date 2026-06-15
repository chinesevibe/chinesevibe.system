import { z } from "zod"

const optionalText = (max = 2000) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }, z.string().max(max).nullable().optional())

export const invConsumptionTypeSchema = z.enum([
  "production",
  "sampling",
  "testing",
])

export const invDamageTypeSchema = z.enum([
  "damaged",
  "spoiled",
  "expired",
  "lost",
  "adjustment",
])

export const invDamageStatusSchema = z.enum(["pending", "approved", "rejected"])

export const invDamageIdSchema = z.string().uuid("ไม่พบรายงานความเสียหาย")

export const invConsumptionItemSchema = z.object({
  sku_id: z.string().uuid("เลือก SKU"),
  qty: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  consumption_type: invConsumptionTypeSchema,
  notes: optionalText(1000),
})

export const recordConsumptionSchema = z.object({
  branch_id: z.string().uuid("เลือกสาขา"),
  warehouse_id: z.string().uuid("เลือกคลังสินค้า"),
  notes: optionalText(2000),
  items: z
    .array(invConsumptionItemSchema)
    .min(1, "เพิ่มรายการใช้งานอย่างน้อย 1 รายการ"),
})

export const invDamageItemSchema = z.object({
  sku_id: z.string().uuid("เลือก SKU"),
  qty: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  damage_type: invDamageTypeSchema,
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(2000),
  photo_url: optionalText(1000),
  notes: optionalText(1000),
})

export const createDamageReportSchema = z.object({
  branch_id: z.string().uuid("เลือกสาขา"),
  warehouse_id: z.string().uuid("เลือกคลังสินค้า"),
  notes: optionalText(2000),
  items: z
    .array(invDamageItemSchema)
    .min(1, "เพิ่มรายการความเสียหายอย่างน้อย 1 รายการ"),
})

export const approveDamageSchema = z.object({
  id: invDamageIdSchema,
})

export const rejectDamageSchema = z.object({
  id: invDamageIdSchema,
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล").max(2000),
})

export const listDamageReportsSchema = z.object({
  status: invDamageStatusSchema.optional(),
  branch_id: z.string().uuid().optional(),
})

export const uploadDamagePhotoSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.coerce.number().int().positive().max(5 * 1024 * 1024),
})

export type RecordConsumptionInput = z.infer<typeof recordConsumptionSchema>
export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>
export type ApproveDamageInput = z.infer<typeof approveDamageSchema>
export type RejectDamageInput = z.infer<typeof rejectDamageSchema>
export type ListDamageReportsInput = z.infer<typeof listDamageReportsSchema>
