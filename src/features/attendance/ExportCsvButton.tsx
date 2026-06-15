"use client"

import { Button } from "@/components/ui/button"
import { rowsToCsv } from "@/features/attendance/csv"
import type { AttendanceRow } from "@/features/attendance/types"

export function ExportCsvButton({ rows }: { rows: AttendanceRow[] }) {
  function download() {
    const csv = rowsToCsv(rows)
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={rows.length === 0} onClick={download}>
      Export CSV (หน้านี้)
    </Button>
  )
}
