export { roundPayrollHours } from "@/lib/payroll/hour-policy"
import { roundPayrollHours } from "@/lib/payroll/hour-policy"

/** Format payroll hours for display as whole hours. */
export function formatPayrollHours(hours: number): string {
  return String(roundPayrollHours(hours))
}
