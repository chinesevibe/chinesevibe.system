"use client"

import { Button } from "@/components/ui/button"

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function InventoryCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string
  headers: string[]
  rows: string[][]
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const lines = [headers.map(escapeCsv).join(",")]
        for (const row of rows) lines.push(row.map((cell) => escapeCsv(cell ?? "")).join(","))
        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
          type: "text/csv;charset=utf-8",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Export CSV
    </Button>
  )
}
