import { redirect } from "next/navigation"

/** Odoo payroll UI hidden — native engine at /admin/payroll/runs */
export default function AdminPayrollOdooPage() {
  redirect("/admin/payroll/runs")
}
