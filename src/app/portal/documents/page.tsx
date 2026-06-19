import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { EmployeeDocumentTable } from "@/features/portal/EmployeeDocumentTable"
import { getEmployeeDocumentRequests } from "@/features/portal/data"
import { getCurrentEmployee } from "@/lib/auth/session"
import { liffUrl } from "@/lib/i18n/liff-url"
import { coerceLocale } from "@/lib/i18n/types"
import { Button } from "@/components/ui/button"

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const rows = await getEmployeeDocumentRequests(employee.id)
  const locale = coerceLocale(lang ?? employee.preferred_locale)
  const liffDocumentsUrl = liffUrl("/liff/documents", locale) ?? "/liff/documents"

  return (
    <AdminPageShell
      title="เอกสาร"
      description="คำขอเอกสารของคุณ"
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href={liffDocumentsUrl} className="inline-flex items-center gap-1.5">
              ขอเอกสารใหม่
              <ExternalLink className="size-3.5" />
            </Link>
          }
        />
      }
    >
      <EmployeeDocumentTable rows={rows} />
    </AdminPageShell>
  )
}
