import { z } from "zod"

import { checkboxBoolean, optionalString } from "@/features/inventory/validators/shared"

export const invSupplierSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัส"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อ"),
  address: optionalString,
  contact: optionalString,
  is_active: checkboxBoolean.default(true),
})
