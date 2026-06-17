import { z } from "zod"

import { checkboxBoolean, optionalString } from "@/features/inventory/validators/shared"

const issueMethodSchema = z.enum(["fefo", "fifo", "manual"])
const storageTypeSchema = z.enum(["dry", "chilled", "frozen"])

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
  expiry_required: checkboxBoolean.default(false),
  lot_tracking_required: checkboxBoolean.default(true),
  default_issue_method: issueMethodSchema.default("fefo"),
  shelf_life_days: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number().int().positive("อายุเก็บต้องมากกว่า 0").nullable().optional()
  ),
  storage_type: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    storageTypeSchema.nullable().optional()
  ),
})
