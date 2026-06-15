import type { SupabaseClient } from "@supabase/supabase-js"

import { getAdminClient } from "@/lib/auth/admin-client"

async function deleteByEmployeeId(
  admin: SupabaseClient,
  table: string,
  employeeId: string
): Promise<string | null> {
  const { error } = await admin.from(table).delete().eq("employee_id", employeeId)
  return error?.message ?? null
}

async function clearEmployeeReferences(
  admin: SupabaseClient,
  employeeId: string
): Promise<string | null> {
  const clears: Array<{ table: string; column: string }> = [
    { table: "hr_leaves", column: "approved_by" },
    { table: "hr_leaves", column: "manager_decided_by" },
    { table: "hr_leaves", column: "hr_decided_by" },
    { table: "hr_overtime_requests", column: "manager_decided_by" },
    { table: "hr_overtime_requests", column: "hr_decided_by" },
    { table: "hr_overtime_requests", column: "submitted_by" },
    { table: "hr_attendance_submissions", column: "manager_decided_by" },
    { table: "hr_attendance_submissions", column: "hr_decided_by" },
  ]

  for (const { table, column } of clears) {
    const { error } = await admin.from(table).update({ [column]: null }).eq(column, employeeId)
    if (error) return error.message
  }

  return null
}

/**
 * Permanently removes an employee and all dependent rows (attendance, leaves,
 * compliance/blacklist notes, payroll lines, etc.). Uses the service-role client
 * so RLS does not block cascaded child deletes.
 */
export async function permanentDeleteEmployee(
  employeeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getAdminClient()

  const steps: Array<{ label: string; run: () => Promise<string | null> }> = [
    {
      label: "complaint replies",
      run: async () => {
        const { error } = await admin
          .from("hr_complaint_replies")
          .delete()
          .eq("author_employee_id", employeeId)
        return error?.message ?? null
      },
    },
    {
      label: "payroll hour lines",
      run: () => deleteByEmployeeId(admin, "hr_payroll_hour_lines", employeeId),
    },
    {
      label: "attendance submissions",
      run: () => deleteByEmployeeId(admin, "hr_attendance_submissions", employeeId),
    },
    {
      label: "attendance",
      run: () => deleteByEmployeeId(admin, "hr_attendance", employeeId),
    },
    {
      label: "leaves",
      run: () => deleteByEmployeeId(admin, "hr_leaves", employeeId),
    },
    {
      label: "leave balances",
      run: () => deleteByEmployeeId(admin, "hr_leave_balances", employeeId),
    },
    {
      label: "alerts",
      run: () => deleteByEmployeeId(admin, "hr_alerts", employeeId),
    },
    {
      label: "overtime requests",
      run: () => deleteByEmployeeId(admin, "hr_overtime_requests", employeeId),
    },
    {
      label: "document requests",
      run: () => deleteByEmployeeId(admin, "hr_document_requests", employeeId),
    },
    {
      label: "compliance notes",
      run: () => deleteByEmployeeId(admin, "hr_compliance_notes", employeeId),
    },
    {
      label: "approval references",
      run: () => clearEmployeeReferences(admin, employeeId),
    },
    {
      label: "employee",
      run: async () => {
        const { error } = await admin.from("hr_employees").delete().eq("id", employeeId)
        return error?.message ?? null
      },
    },
  ]

  for (const step of steps) {
    const message = await step.run()
    if (message) {
      return { ok: false, error: `ลบไม่สำเร็จ (${step.label}): ${message}` }
    }
  }

  return { ok: true }
}
