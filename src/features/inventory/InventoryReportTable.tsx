import { InventoryCsvButton } from "@/features/inventory/InventoryCsvButton"

export function InventoryReportTable({
  title,
  filename,
  headers,
  rows,
  summary,
}: {
  title: string
  filename: string
  headers: string[]
  rows: string[][]
  summary: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <InventoryCsvButton filename={filename} headers={headers} rows={rows} />
      </div>
      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-3 py-2 align-top">{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
