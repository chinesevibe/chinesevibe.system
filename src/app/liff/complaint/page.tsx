import { ComplaintLiffContent } from "@/features/liff/ComplaintLiffContent"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"

export default async function ComplaintLiffPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale = coerceLocale(lang)
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="complaint.page.title" locale={locale} />
  }

  return <ComplaintLiffContent employeeName={employee.name} />
}
