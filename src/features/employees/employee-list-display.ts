import type { EmployeeRow } from "@/features/employees/data"

type PillVariant = "pending" | "approved" | "rejected" | "warning" | "info" | "neutral"

const DISPLAY_STATUS: Record<
  EmployeeRow["displayStatus"],
  { label: string; variant: PillVariant }
> = {
  active: { label: "Active", variant: "approved" },
  inactive: { label: "Inactive", variant: "neutral" },
  probation: { label: "ทดลองงาน", variant: "pending" },
  onboarding: { label: "รอกำหนดสาขา", variant: "pending" },
  pending_approval: { label: "รออนุมัติ", variant: "warning" },
}

export function employeeDisplayStatusPill(status: EmployeeRow["displayStatus"]) {
  return DISPLAY_STATUS[status]
}
