import { z } from "zod"

const plannedAtSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่วางแผนไม่ถูกต้อง")

export const stockCountIdSchema = z.string().uuid("รหัสแผนตรวจนับไม่ถูกต้อง")

export const createStockCountSchema = z.object({
  branch_id: z.string().uuid("กรุณาเลือกสาขา"),
  warehouse_id: z.string().uuid("กรุณาเลือกคลังสินค้า"),
  scope: z.literal("all"),
  planned_at: plannedAtSchema.optional(),
  notes: z.string().trim().max(500).optional(),
})

export const startStockCountSchema = z.object({
  count_id: stockCountIdSchema,
})

export const saveStockCountItemsSchema = z.object({
  count_id: stockCountIdSchema,
  items: z
    .array(
      z.object({
        id: z.string().uuid("รายการตรวจนับไม่ถูกต้อง"),
        physical_qty: z.preprocess(
          (value) => {
            if (value === null || value === undefined || value === "") return null
            return value
          },
          z.coerce.number().min(0, "จำนวนตรวจนับต้องไม่ติดลบ").nullable(),
        ),
      }),
    )
    .min(1, "กรุณากรอกจำนวนจริงอย่างน้อย 1 รายการ"),
})

export const finalizeStockCountSchema = z.object({
  count_id: stockCountIdSchema,
})

export const cancelStockCountSchema = z.object({
  count_id: stockCountIdSchema,
})

export type CreateStockCountInput = z.infer<typeof createStockCountSchema>
export type StartStockCountInput = z.infer<typeof startStockCountSchema>
export type SaveStockCountItemsInput = z.infer<typeof saveStockCountItemsSchema>
export type FinalizeStockCountInput = z.infer<typeof finalizeStockCountSchema>
export type CancelStockCountInput = z.infer<typeof cancelStockCountSchema>
