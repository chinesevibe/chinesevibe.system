import { DocumentsLiffContent } from "@/features/liff/DocumentsLiffContent"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"

export default async function DocumentsLiffPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const locale = coerceLocale(lang)
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="doc.page.title" locale={locale} />
  }

  return <DocumentsLiffContent employeeName={employee.name} />
}
