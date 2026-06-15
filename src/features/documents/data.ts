import {
  DOC_TYPE_LABELS,
  type DocStatus,
  type DocType,
} from "@/features/documents/types"
import { createClient } from "@/lib/supabase/server"

export const DOC_PAGE_SIZE = 20

export type DocumentRequestRow = {
  id: string
  employeeId: string
  employeeName: string
  department: string | null
  docType: DocType
  copies: number
  purpose: string
  status: DocStatus
  hrNote: string | null
  resultFileUrl: string | null
  createdAt: string
}

export type DocListParams = {
  status?: DocStatus | "all"
  page?: number
}

export function normalizeDocParams(raw: {
  [key: string]: string | string[] | undefined
}): Required<DocListParams> {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const statusRaw = get("status")
  const status = (
    [
      "pending",
      "on_hold",
      "processing",
      "ready",
      "completed",
      "rejected",
    ] as const
  ).includes(statusRaw as DocStatus)
    ? (statusRaw as DocStatus)
    : "all"
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1)
  return { status, page }
}

function employeeJoin(
  joined:
    | { name: string; department: string | null }
    | Array<{ name: string; department: string | null }>
): { name: string; department: string | null } {
  return Array.isArray(joined) ? joined[0] : joined
}

export async function getDocumentRequests(params: Required<DocListParams>) {
  const supabase = await createClient()

  let query = supabase
    .from("hr_document_requests")
    .select(
      "id, employee_id, doc_type, copies, purpose, status, hr_note, result_file_url, created_at, hr_employees!inner(name, department)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data, count, error } = await query.range(
    (params.page - 1) * DOC_PAGE_SIZE,
    params.page * DOC_PAGE_SIZE - 1
  )
  if (error) throw error

  type RawRow = {
    id: string
    employee_id: string
    doc_type: string
    copies: number
    purpose: string
    status: string
    hr_note: string | null
    result_file_url: string | null
    created_at: string
    hr_employees:
      | { name: string; department: string | null }
      | Array<{ name: string; department: string | null }>
  }

  const rows: DocumentRequestRow[] = ((data ?? []) as RawRow[]).map((row) => {
    const emp = employeeJoin(row.hr_employees)
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: emp.name,
      department: emp.department,
      docType: row.doc_type as DocType,
      copies: row.copies,
      purpose: row.purpose,
      status: row.status as DocStatus,
      hrNote: row.hr_note,
      resultFileUrl: row.result_file_url,
      createdAt: row.created_at,
    }
  })

  const pendingCountQuery = await supabase
    .from("hr_document_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  return {
    rows,
    total: count ?? 0,
    pendingCount: pendingCountQuery.count ?? 0,
  }
}

export { DOC_TYPE_LABELS }
