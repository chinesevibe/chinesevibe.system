import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import { AlertTable } from "@/features/alerts/AlertTable"
import { AlertTabs } from "@/features/alerts/AlertTabs"
import { getAlertRows } from "@/features/alerts/data"
import type { AlertTab } from "@/features/alerts/types"

function parseTab(raw: string | undefined): AlertTab {
  if (raw === "visa" || raw === "work_permit") return raw
  return "probation"
}

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const tab = parseTab(typeof params.tab === "string" ? params.tab : undefined)
  const rows = await getAlertRows(tab)

  const tabLabel =
    tab === "probation" ? "ทดลองงาน" : tab === "visa" ? "วีซ่า" : "Work Permit"

  return (
    <AdminPageShell
      title="Alerts"
      description={`รายการแจ้งเตือน ${tabLabel} — ใกล้ครบ 60 วัน หรือหมดอายุแล้ว`}
      badge={<CountBadge count={rows.length} label="รายการ" />}
    >
      <div className="flex flex-col gap-4">
        <AlertTabs active={tab} />
        <AlertTable rows={rows} />
        <p className="text-xs text-muted-foreground">
          บันทึกผลทดลองงาน / อัปเดตวีซ่าได้ที่หน้าโปรไฟล์พนักงาน
        </p>
      </div>
    </AdminPageShell>
  )
}
