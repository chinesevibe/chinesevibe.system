import { z } from "zod"

import { checkboxBoolean, optionalString } from "@/features/inventory/validators/shared"

export const invBranchSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสสาขา"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสาขา"),
  address: optionalString,
  is_active: checkboxBoolean.default(true),
})
