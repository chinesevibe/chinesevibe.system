import { z } from "zod"

const transferItemSchema = z.object({
  sku_id: z.string().uuid("SKU ไม่ถูกต้อง"),
  qty_sent: z.coerce.number().positive("จำนวนส่งต้องมากกว่า 0"),
  lot_number: z.string().trim().min(1, "กรุณากรอก Lot").max(120).optional(),
})

export const createTransferSchema = z
  .object({
    from_branch_id: z.string().uuid("กรุณาเลือกสาขาต้นทาง"),
    to_branch_id: z.string().uuid("กรุณาเลือกสาขาปลายทาง"),
    from_warehouse_id: z.string().uuid("กรุณาเลือกคลังต้นทาง"),
    to_warehouse_id: z.string().uuid("กรุณาเลือกคลังปลายทาง"),
    shipper: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(transferItemSchema).min(1, "กรุณาเพิ่มรายการอย่างน้อย 1 รายการ"),
  })
  .superRefine((value, ctx) => {
    if (value.from_branch_id === value.to_branch_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "สาขาต้นทางและปลายทางต้องไม่ซ้ำกัน",
        path: ["to_branch_id"],
      })
    }
    if (value.from_warehouse_id === value.to_warehouse_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "คลังต้นทางและปลายทางต้องไม่ซ้ำกัน",
        path: ["to_warehouse_id"],
      })
    }
  })

export const transferIdSchema = z.string().uuid("รหัสใบโอนไม่ถูกต้อง")

export const sendTransferSchema = z.object({
  transfer_id: transferIdSchema,
  shipper: z.string().trim().max(120).optional(),
})

export const receiveTransferSchema = z.object({
  transfer_id: transferIdSchema,
  items: z
    .array(
      z.object({
        id: z.string().uuid("รายการรับสินค้าไม่ถูกต้อง"),
        qty_received: z.coerce.number().min(0, "จำนวนรับต้องไม่ติดลบ"),
      })
    )
    .min(1, "กรุณาระบุรายการรับสินค้า"),
})

export const cancelTransferSchema = z.object({
  transfer_id: transferIdSchema,
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type SendTransferInput = z.infer<typeof sendTransferSchema>
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>
export type CancelTransferInput = z.infer<typeof cancelTransferSchema>
