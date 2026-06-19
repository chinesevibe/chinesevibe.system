import { ApprovalsLiffContent } from "@/features/liff/ApprovalsLiffContent"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { fetchPendingQueuePayload } from "@/lib/approvals/pending-queue-data"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { t } from "@/lib/i18n/translate"
import { coerceLocale } from "@/lib/i18n/types"
import { cookies } from "next/headers"

export default async function ApprovalsLiffPage() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="liff.approvals.title" />
  }

  if (!canManageHr(employee.role)) {
    const cookieStore = await cookies()
    const locale = coerceLocale(cookieStore.get("hr_locale")?.value ?? employee.preferred_locale)
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-center text-sm text-muted-foreground">
          {t("liff.approvals.forbidden", locale)}
        </p>
      </main>
    )
  }

  const { items, counts, total } = await fetchPendingQueuePayload()

  return (
    <ApprovalsLiffContent
      initialItems={items}
      initialCounts={counts}
      initialTotal={total}
      callerRole={employee.role}
    />
  )
}
