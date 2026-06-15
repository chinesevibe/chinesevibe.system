import { z } from "zod"

import { checkboxBoolean } from "@/features/inventory/validators/shared"

export const invWarehouseSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสคลัง"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อคลัง"),
  branch_id: z.string().trim().min(1, "กรุณาเลือกสาขา"),
  type: z.enum(["main", "sub"]),
  is_active: checkboxBoolean.default(true),
})
