import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export interface PayslipPdfInput {
  employeeName: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  payType: string
  lines: Array<{ label: string; amount: number }>
  grossAmount: number
  ssoDeduction: number
  taxDeduction: number
  netAmount: number
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTh(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export async function generatePayslipPdf(input: PayslipPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let y = 780
  const left = 50

  const draw = (text: string, size = 11, bold = false) => {
    page.drawText(text, {
      x: left,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= size + 6
  }

  draw("SLIP NGERT DEUAN / PAYSLIP", 16, true)
  y -= 4
  draw(`Phanakgan: ${input.employeeName}`, 12, true)
  draw(`Rorb: ${formatDateTh(input.periodStart)} - ${formatDateTh(input.periodEnd)}`)
  draw(`Duean ang: ${input.periodLabel}`)
  draw(`Wan jai: ${formatDateTh(input.paymentDate)}`)
  draw(`Prakait: ${input.payType}`)
  y -= 8

  draw("Rai Kan", 12, true)
  for (const line of input.lines) {
    const sign = line.amount < 0 ? "-" : ""
    const abs = Math.abs(line.amount)
    page.drawText(`${line.label}`, { x: left, y, size: 10, font })
    page.drawText(`${sign}${formatMoney(abs)}`, {
      x: 420,
      y,
      size: 10,
      font,
    })
    y -= 16
  }

  y -= 8
  draw(`Tong Gross: ${formatMoney(input.grossAmount)}`, 11, true)
  if (input.ssoDeduction > 0) {
    draw(`SSO: -${formatMoney(input.ssoDeduction)}`)
  }
  if (input.taxDeduction > 0) {
    draw(`Tax: -${formatMoney(input.taxDeduction)}`)
  }
  draw(`Net: ${formatMoney(input.netAmount)}`, 13, true)

  return doc.save()
}

export const PAYROLL_PDF_BUCKET = "payroll-payslips"

export function payslipStoragePath(employeeId: string, runId: string): string {
  return `${employeeId}/${runId}.pdf`
}
