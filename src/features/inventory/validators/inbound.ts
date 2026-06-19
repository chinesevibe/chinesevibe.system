import { uuidOptional } from "@/features/inventory/validators/shared"
import { z } from "zod"

export const invInboundOrderSchema = z.object({
  supplier_id: uuidOptional,
  warehouse_id: z.string().uuid("เลือกคลังสินค้า"),
  notes: z.string().max(2000).optional().nullable(),
})

export const invInboundItemSchema = z.object({
  sku_id: z.string().uuid("เลือก SKU"),
  quantity: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  cost_per_unit: z.coerce.number().min(0).optional().nullable(),
  lot_number: z.string().max(100).optional().nullable(),
  expiry_date: z.string().optional().nullable(),
})

export const invInboundScanSchema = z.object({
  order_id: z.string().uuid(),
  barcode: z.string().min(1, "กรุณาระบุ barcode"),
  quantity: z.coerce.number().positive("จำนวนต้องมากกว่า 0"),
  lot_number: z.string().max(100).optional().nullable(),
  expiry_date: z.string().optional().nullable(),
})
