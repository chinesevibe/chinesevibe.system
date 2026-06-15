import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import { PAYROLL_PDF_BUCKET } from "@/lib/payroll/payslip-pdf"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const admin = getAdminClient()

    const { data: slip, error } = await admin
      .from("hr_payslips")
      .select("id, employee_id, pdf_path, status")
      .eq("id", id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!slip) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const isOwner = slip.employee_id === caller.id
    const isHr = ["hr", "admin", "dev"].includes(caller.role)
    if (!isOwner && !isHr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (slip.status !== "final" && !isHr) {
      return NextResponse.json({ error: "Payslip not available" }, { status: 403 })
    }

    if (!slip.pdf_path) {
      return NextResponse.json({ error: "PDF not generated yet" }, { status: 404 })
    }

    const { data: signed, error: signError } = await admin.storage
      .from(PAYROLL_PDF_BUCKET)
      .createSignedUrl(slip.pdf_path as string, 3600)

    if (signError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signError?.message ?? "Failed to sign URL" },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
