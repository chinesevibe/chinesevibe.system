import { z } from "zod"

import { checkboxBoolean, optionalString, uuidOptional } from "@/features/inventory/validators/shared"

export const invBranchSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสสาขา"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสาขา"),
  address: optionalString,
  hr_branch_id: uuidOptional,
  is_active: checkboxBoolean.default(true),
})
