import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import { payTypeDisplayLabel } from "@/lib/payroll/pay-type"
import {
  generatePayslipPdf,
  payslipStoragePath,
  PAYROLL_PDF_BUCKET,
} from "@/lib/payroll/payslip-pdf"
import { getRunWithPayslips } from "@/lib/payroll/run"

function canManagePayroll(role: string): boolean {
  return ["hr", "dev"].includes(role)
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !canManagePayroll(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const run = await getRunWithPayslips(id)
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    if (run.status === "draft") {
      return NextResponse.json(
        { error: "ต้อง lock รอบก่อนสร้าง PDF" },
        { status: 400 }
      )
    }

    const admin = getAdminClient()
    const results: Array<{ payslip_id: string; pdf_path: string; success: boolean; error?: string }> =
      []

    for (const slip of run.payslips) {
      try {
        const { data: lines } = await admin
          .from("hr_payslip_lines")
          .select("label, amount, sort_order")
          .eq("payslip_id", slip.id)
          .order("sort_order")

        const pdfBytes = await generatePayslipPdf({
          employeeName: slip.employee_name ?? slip.employee_id,
          periodLabel: run.period,
          periodStart: run.period_start,
          periodEnd: run.period_end,
          paymentDate: slip.payment_date,
          payType: payTypeDisplayLabel(slip.pay_type),
          lines: (lines ?? []).map((l) => ({
            label: l.label as string,
            amount: Number(l.amount),
          })),
          grossAmount: slip.gross_amount,
          ssoDeduction: slip.sso_deduction,
          taxDeduction: slip.tax_deduction,
          netAmount: slip.net_amount,
        })

        const path = payslipStoragePath(slip.employee_id, run.id)
        const { error: uploadError } = await admin.storage
          .from(PAYROLL_PDF_BUCKET)
          .upload(path, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          })

        if (uploadError) throw new Error(uploadError.message)

        await admin.from("hr_payslips").update({ pdf_path: path }).eq("id", slip.id)

        results.push({ payslip_id: slip.id, pdf_path: path, success: true })
      } catch (err) {
        results.push({
          payslip_id: slip.id,
          pdf_path: "",
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const successful = results.filter((r) => r.success).length
    return NextResponse.json({
      success: successful > 0,
      generated: successful,
      total: run.payslips.length,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
