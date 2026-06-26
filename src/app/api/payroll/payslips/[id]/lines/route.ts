import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/auth/admin-client"

type Params = { params: Promise<{ id: string }> }

/** GET /api/payroll/payslips/[id]/lines — list all lines for a payslip */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: payslipId } = await params
  const admin = getAdminClient()

  const { data: lines, error } = await admin
    .from("hr_payslip_lines")
    .select("id, label, amount, note, source, sort_order, code")
    .eq("payslip_id", payslipId)
    .order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lines: lines ?? [] })
}

/** Recalculate net_amount from all lines for a payslip and update hr_payslips */
async function recalculateNet(payslipId: string): Promise<void> {
  const admin = getAdminClient()

  const { data: payslip } = await admin
    .from("hr_payslips")
    .select("gross_amount, sso_deduction, tax_deduction")
    .eq("id", payslipId)
    .single()

  if (!payslip) return

  const { data: manualLines } = await admin
    .from("hr_payslip_lines")
    .select("amount")
    .eq("payslip_id", payslipId)
    .eq("source", "manual")

  const manualTotal = (manualLines ?? []).reduce(
    (sum, l) => sum + Number(l.amount ?? 0),
    0
  )

  const net =
    Number(payslip.gross_amount) +
    manualTotal -
    Number(payslip.sso_deduction) -
    Number(payslip.tax_deduction)

  await admin
    .from("hr_payslips")
    .update({ net_amount: Math.round(net * 100) / 100 })
    .eq("id", payslipId)
}

/** POST /api/payroll/payslips/[id]/lines — add a manual line */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: payslipId } = await params
  const admin = getAdminClient()

  // Guard: run must be draft
  const { data: payslip } = await admin
    .from("hr_payslips")
    .select("run_id")
    .eq("id", payslipId)
    .single()

  if (!payslip) {
    return NextResponse.json({ error: "payslip not found" }, { status: 404 })
  }

  const { data: run } = await admin
    .from("hr_payroll_runs")
    .select("status")
    .eq("id", payslip.run_id)
    .single()

  if (run?.status !== "draft") {
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไข payslip ที่ locked แล้ว" },
      { status: 400 }
    )
  }

  const body = await req.json()
  const { label, amount, note } = body as {
    label?: string
    amount?: number
    note?: string
  }

  if (!label || typeof amount !== "number") {
    return NextResponse.json(
      { error: "label และ amount จำเป็นต้องระบุ" },
      { status: 400 }
    )
  }

  // Max sort_order + 10
  const { data: existingLines } = await admin
    .from("hr_payslip_lines")
    .select("sort_order")
    .eq("payslip_id", payslipId)
    .order("sort_order", { ascending: false })
    .limit(1)

  const maxSortOrder = existingLines?.[0]?.sort_order ?? 90
  const sortOrder = maxSortOrder + 10

  const code = amount >= 0 ? "MANUAL_ADD" : "MANUAL_DEDUCT"

  const { data: line, error } = await admin
    .from("hr_payslip_lines")
    .insert({
      payslip_id: payslipId,
      code,
      label,
      amount: Math.round(amount * 100) / 100,
      sort_order: sortOrder,
      source: "manual",
      note: note ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await recalculateNet(payslipId)

  // Return updated payslip net
  const { data: updated } = await admin
    .from("hr_payslips")
    .select("net_amount")
    .eq("id", payslipId)
    .single()

  return NextResponse.json({ line, net_amount: updated?.net_amount ?? null })
}

/** DELETE /api/payroll/payslips/[id]/lines?lineId=xxx — remove a manual line */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: payslipId } = await params
  const lineId = req.nextUrl.searchParams.get("lineId")
  if (!lineId) {
    return NextResponse.json({ error: "lineId required" }, { status: 400 })
  }

  const admin = getAdminClient()

  // Guard: must be manual line belonging to this payslip
  const { data: line } = await admin
    .from("hr_payslip_lines")
    .select("id, source, payslip_id")
    .eq("id", lineId)
    .single()

  if (!line || line.payslip_id !== payslipId) {
    return NextResponse.json({ error: "line not found" }, { status: 404 })
  }
  if (line.source !== "manual") {
    return NextResponse.json(
      { error: "ลบได้เฉพาะรายการที่ HR กรอกเท่านั้น" },
      { status: 400 }
    )
  }

  // Guard: run must be draft
  const { data: payslip } = await admin
    .from("hr_payslips")
    .select("run_id")
    .eq("id", payslipId)
    .single()

  const { data: run } = await admin
    .from("hr_payroll_runs")
    .select("status")
    .eq("id", payslip!.run_id)
    .single()

  if (run?.status !== "draft") {
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไข payslip ที่ locked แล้ว" },
      { status: 400 }
    )
  }

  const { error } = await admin
    .from("hr_payslip_lines")
    .delete()
    .eq("id", lineId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await recalculateNet(payslipId)

  const { data: updated } = await admin
    .from("hr_payslips")
    .select("net_amount")
    .eq("id", payslipId)
    .single()

  return NextResponse.json({ success: true, net_amount: updated?.net_amount ?? null })
}
