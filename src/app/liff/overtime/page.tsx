import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { OvertimeLiffContent } from "@/features/liff/OvertimeLiffContent"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"

export default async function OvertimeLiffPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale = coerceLocale(lang)
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="ot.page.menuTitle" locale={locale} />
  }

  return <OvertimeLiffContent employeeName={employee.name} />
}
