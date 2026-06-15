import { NextResponse, type NextRequest } from "next/server"

import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers.map(csvEscape).join(",")]
  for (const row of rows) {
    lines.push(row.map((c) => csvEscape(c ?? "")).join(","))
  }
  return lines.join("\n")
}

export async function GET(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || (!canManageHr(caller.role) && !isCeo(caller.role) && !isDev(caller.role))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const type = request.nextUrl.searchParams.get("type") ?? "attendance"
  const days = Number(request.nextUrl.searchParams.get("days") ?? "30")
  const department = request.nextUrl.searchParams.get("department")?.trim() || null
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const supabase = await createClient()
  let filename = "report.csv"
  let csv = ""

  if (type === "attendance") {
    const query = supabase
      .from("hr_attendance")
      .select("check_in_at, is_late, work_hours, hr_employees(name, department)")
      .gte("check_in_at", since)
      .order("check_in_at", { ascending: false })
      .limit(5000)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? [])
      .filter((r) => {
        if (!department) return true
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return (emp as { department?: string })?.department === department
      })
      .map((r) => {
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return [
          (emp as { name: string })?.name ?? "",
          (emp as { department?: string })?.department ?? "",
          new Date(r.check_in_at as string).toISOString(),
          r.is_late ? "yes" : "no",
          r.work_hours != null ? String(r.work_hours) : "",
        ]
      })

    csv = toCsv(["employee", "department", "check_in_at", "late", "hours"], rows)
    filename = `attendance-${days}d.csv`
  } else if (type === "leave") {
    const { data, error } = await supabase
      .from("hr_leaves")
      .select("type, start_date, end_date, status, hr_employees!employee_id(name, department)")
      .order("created_at", { ascending: false })
      .limit(2000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? [])
      .filter((r) => {
        if (!department) return true
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return (emp as { department?: string })?.department === department
      })
      .map((r) => {
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return [
          (emp as { name: string })?.name ?? "",
          (emp as { department?: string })?.department ?? "",
          r.type as string,
          `${r.start_date} – ${r.end_date}`,
          r.status as string,
        ]
      })

    csv = toCsv(["employee", "department", "type", "dates", "status"], rows)
    filename = "leave-report.csv"
  } else if (type === "overtime") {
    const { data, error } = await supabase
      .from("hr_overtime_requests")
      .select("work_date, start_time, end_time, status, hr_employees!employee_id(name, department)")
      .order("created_at", { ascending: false })
      .limit(2000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? [])
      .filter((r) => {
        if (!department) return true
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return (emp as { department?: string })?.department === department
      })
      .map((r) => {
        const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
        return [
          (emp as { name: string })?.name ?? "",
          (emp as { department?: string })?.department ?? "",
          r.work_date as string,
          `${String(r.start_time).slice(0, 5)}-${String(r.end_time).slice(0, 5)}`,
          r.status as string,
        ]
      })

    csv = toCsv(["employee", "department", "date", "time", "status"], rows)
    filename = "overtime-report.csv"
  } else {
    return NextResponse.json({ error: "invalid type" }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
