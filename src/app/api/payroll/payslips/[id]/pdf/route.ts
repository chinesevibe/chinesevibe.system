import { NextRequest, NextResponse } from "next/server"
import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { getAdminClient } from "@/lib/auth/admin-client"
import { PayslipPdf } from "@/lib/payroll/payslip-pdf"
import { getYtdForEmployee } from "@/lib/payroll/ytd"
import type { PayslipPdfInput, PdfLang } from "@/lib/payroll/payslip-pdf-types"

type Params = { params: Promise<{ id: string }> }

const VALID_LANGS: PdfLang[] = ["zh", "th", "en"]

export async function GET(req: NextRequest, { params }: Params) {
  const { id: payslipId } = await params
  const langParam = req.nextUrl.searchParams.get("lang") ?? "zh"
  const lang: PdfLang = VALID_LANGS.includes(langParam as PdfLang)
    ? (langParam as PdfLang)
    : "zh"

  const admin = getAdminClient()

  // 1. Fetch payslip
  const { data: payslip, error: payslipError } = await admin
    .from("hr_payslips")
    .select(
      `id, run_id, employee_id, pay_type, pay_day, payment_date,
       gross_amount, sso_deduction, tax_deduction, net_amount,
       regular_hours, ot_hours, base_rate, monthly_salary,
       hr_payroll_runs!inner(period, period_start, period_end)`
    )
    .eq("id", payslipId)
    .single()

  if (payslipError || !payslip) {
    return NextResponse.json({ error: "payslip not found" }, { status: 404 })
  }

  // 2. Fetch payslip lines
  const { data: lines } = await admin
    .from("hr_payslip_lines")
    .select("label, code, amount, note, source, sort_order")
    .eq("payslip_id", payslipId)
    .order("sort_order", { ascending: true })

  // 3. Fetch employee + branch + dept
  const { data: employee } = await admin
    .from("hr_employees")
    .select(
      `name, employee_code,
       hr_branches(name),
       hr_departments(name)`
    )
    .eq("id", payslip.employee_id)
    .single()

  const runRaw = payslip.hr_payroll_runs
  const run = (Array.isArray(runRaw) ? runRaw[0] : runRaw) as unknown as {
    period: string
    period_start: string
    period_end: string
  }

  // 4. YTD
  const year = new Date(run.period_start).getFullYear()
  const ytd = await getYtdForEmployee(payslip.employee_id, year, payslip.run_id).catch(
    () => null
  )

  // 5. Build period label
  const [y, m] = run.period.split("-")
  const monthNames: Record<PdfLang, string[]> = {
    zh: ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],
    th: ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."],
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  }
  const monthIdx = parseInt(m, 10) - 1
  const periodLabel = `${monthNames[lang][monthIdx]} ${y}`

  // 6. Build input
  const branchNode = employee?.hr_branches as { name?: string } | null
  const deptNode = employee?.hr_departments as { name?: string } | null

  const input: PayslipPdfInput = {
    companyName: "ChineseVibe",
    employeeName: employee?.name ?? "-",
    employeeCode: employee?.employee_code ?? "-",
    branchName: branchNode?.name ?? "-",
    departmentName: deptNode?.name ?? "-",
    payType: (payslip.pay_type as "hourly" | "monthly") ?? "hourly",
    paymentDate: payslip.payment_date,
    periodLabel,
    periodStart: run.period_start,
    periodEnd: run.period_end,
    lines: (lines ?? []).map((l) => ({
      label: l.label,
      code: l.code ?? undefined,
      amount: Number(l.amount),
      note: l.note ?? undefined,
    })),
    grossAmount: Number(payslip.gross_amount),
    ssoDeduction: Number(payslip.sso_deduction),
    taxDeduction: Number(payslip.tax_deduction),
    netAmount: Number(payslip.net_amount),
    regularHours: payslip.regular_hours != null ? Number(payslip.regular_hours) : undefined,
    otHours: payslip.ot_hours != null ? Number(payslip.ot_hours) : undefined,
    ytdGross: ytd?.ytdGross,
    ytdTax: ytd?.ytdTax,
    ytdSso: ytd?.ytdSso,
    lang,
  }

  // 7. Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(PayslipPdf, { input }) as any
  const buffer = await renderToBuffer(element)
  const uint8 = new Uint8Array(buffer)

  const filename = `payslip_${employee?.employee_code ?? payslipId}_${run.period}_${lang}.pdf`

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8.byteLength),
    },
  })
}
