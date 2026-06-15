"use client"

type PayslipRow = {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  grossAmount: number
  netAmount: number
  hasPdf: boolean
}

function formatMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PayslipsClient({ rows }: { rows: PayslipRow[] }) {
  async function download(id: string) {
    const res = await fetch(`/api/payroll/payslips/${id}/download`)
    const data = await res.json()
    if (!res.ok) {
      alert(data.error ?? "ดาวน์โหลดไม่สำเร็จ")
      return
    }
    window.open(data.url, "_blank", "noopener,noreferrer")
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">ยังไม่มีสลิปเงินเดือนที่เผยแพร่</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2">รอบ</th>
            <th className="px-3 py-2">ช่วง</th>
            <th className="px-3 py-2">วันจ่าย</th>
            <th className="px-3 py-2">Net</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-3 py-2">{row.period}</td>
              <td className="px-3 py-2">
                {row.periodStart && row.periodEnd
                  ? `${row.periodStart} – ${row.periodEnd}`
                  : "—"}
              </td>
              <td className="px-3 py-2">{row.paymentDate}</td>
              <td className="px-3 py-2 font-medium">{formatMoney(row.netAmount)}</td>
              <td className="px-3 py-2">
                {row.hasPdf ? (
                  <button
                    type="button"
                    className="text-brand-red hover:underline"
                    onClick={() => download(row.id)}
                  >
                    ดาวน์โหลด PDF
                  </button>
                ) : (
                  <span className="text-muted-foreground">รอ PDF</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
