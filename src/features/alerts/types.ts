export type AlertTab = "probation" | "visa" | "work_permit"

export type AlertRow = {
  employeeId: string
  name: string
  department: string | null
  dueDate: string
  daysLeft: number
  field: AlertTab
}
