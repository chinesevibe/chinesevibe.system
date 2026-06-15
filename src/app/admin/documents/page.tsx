import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import { DocumentTable } from "@/features/documents/DocumentTable"
import {
  getDocumentRequests,
  normalizeDocParams,
} from "@/features/documents/data"

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const raw = await searchParams
  const params = normalizeDocParams(raw)
  const { rows, total, pendingCount } = await getDocumentRequests(params)

  return (
    <AdminPageShell
      title="Documents"
      description="คิวคำขอเอกสารและหนังสือรับรอง"
      badge={<CountBadge count={pendingCount} label="รอดำเนินการ" />}
    >
      <DocumentTable rows={rows} />
      <p className="mt-4 text-xs text-muted-foreground">
        ทั้งหมด {total} รายการ
      </p>
    </AdminPageShell>
  )
}
