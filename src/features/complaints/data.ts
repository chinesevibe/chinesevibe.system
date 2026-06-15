import {
  COMPLAINT_STATUS_LABELS,
  type ComplaintStatus,
} from "@/features/complaints/types"
import { createClient } from "@/lib/supabase/server"

export const COMPLAINT_PAGE_SIZE = 20

export type ComplaintRow = {
  id: string
  ticketCode: string
  subject: string
  body: string
  isAnonymous: boolean
  employeeName: string | null
  department: string | null
  status: ComplaintStatus
  createdAt: string
  replies: { message: string; createdAt: string; authorName: string | null }[]
}

export type ComplaintListParams = {
  status?: ComplaintStatus | "all"
  page?: number
}

export function normalizeComplaintParams(raw: {
  [key: string]: string | string[] | undefined
}): Required<ComplaintListParams> {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const statusRaw = get("status")
  const status = (["open", "replied", "closed"] as const).includes(
    statusRaw as ComplaintStatus
  )
    ? (statusRaw as ComplaintStatus)
    : "all"
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1)
  return { status, page }
}

export async function getComplaints(params: Required<ComplaintListParams>) {
  const supabase = await createClient()

  let query = supabase
    .from("hr_complaints")
    .select(
      "id, ticket_code, subject, body, is_anonymous, status, created_at, employee_id, hr_employees(name, department), hr_complaint_replies(message, created_at, hr_employees!author_employee_id(name))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data, count, error } = await query.range(
    (params.page - 1) * COMPLAINT_PAGE_SIZE,
    params.page * COMPLAINT_PAGE_SIZE - 1
  )
  if (error) throw error

  type RawRow = {
    id: string
    ticket_code: string
    subject: string
    body: string
    is_anonymous: boolean
    status: string
    created_at: string
    employee_id: string | null
    hr_employees:
      | { name: string; department: string | null }
      | Array<{ name: string; department: string | null }>
      | null
    hr_complaint_replies: {
      message: string
      created_at: string
      hr_employees: { name: string } | Array<{ name: string }> | null
    }[]
  }

  const rows: ComplaintRow[] = ((data ?? []) as RawRow[]).map((row) => {
    const emp = row.hr_employees
      ? Array.isArray(row.hr_employees)
        ? row.hr_employees[0]
        : row.hr_employees
      : null
    return {
      id: row.id,
      ticketCode: row.ticket_code,
      subject: row.subject,
      body: row.body,
      isAnonymous: row.is_anonymous,
      employeeName: row.is_anonymous ? null : emp?.name ?? null,
      department: row.is_anonymous ? null : emp?.department ?? null,
      status: row.status as ComplaintStatus,
      createdAt: row.created_at,
      replies: (row.hr_complaint_replies ?? [])
        .map((r) => {
          const author = r.hr_employees
            ? Array.isArray(r.hr_employees)
              ? r.hr_employees[0]
              : r.hr_employees
            : null
          return {
            message: r.message,
            createdAt: r.created_at,
            authorName: author?.name ?? "HR",
          }
        })
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    }
  })

  const openCountQuery = await supabase
    .from("hr_complaints")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")

  return {
    rows,
    total: count ?? 0,
    openCount: openCountQuery.count ?? 0,
  }
}

export { COMPLAINT_STATUS_LABELS }
