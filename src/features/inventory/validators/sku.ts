import { z } from "zod"

import { checkboxBoolean, optionalString } from "@/features/inventory/validators/shared"

export const invSkuSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัส SKU"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อ"),
  category: optionalString,
  unit_id: optionalString,
  barcode: optionalString,
  min_stock: z.coerce.number().nonnegative("Min ต้อง ≥ 0"),
  max_stock: z.coerce.number().nonnegative("Max ต้อง ≥ 0"),
  image_url: optionalString,
  is_active: checkboxBoolean.default(true),
})
