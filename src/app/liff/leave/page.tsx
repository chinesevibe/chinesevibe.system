import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { LeaveLiffContent } from "@/features/liff/LeaveLiffContent"
import type { LeaveBalance } from "@/features/leave/LeaveBalanceCard"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

// T16/T17: leave form + balance display + submit via /api/leave/request.
export default async function LeaveLiffPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale = coerceLocale(lang)
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="leave.page.title" locale={locale} />
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("hr_leave_balances")
    .select("leave_type, total_days, used_days")
    .eq("employee_id", employee.id)
  const balances = (data ?? []) as LeaveBalance[]

  return <LeaveLiffContent balances={balances} employeeName={employee.name} />
}
