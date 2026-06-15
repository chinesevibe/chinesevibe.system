import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { EmployeeDocumentTable } from "@/features/portal/EmployeeDocumentTable"
import { getEmployeeDocumentRequests } from "@/features/portal/data"
import { getCurrentEmployee } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"

export default async function PortalDocumentsPage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const rows = await getEmployeeDocumentRequests(employee.id)

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
            <Link href="/liff/documents" className="inline-flex items-center gap-1.5">
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
