import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { MorningPushSettingsPanel } from "@/features/settings/MorningPushSettingsPanel"
import { SettingsPanel } from "@/features/settings/SettingsPanel"
import { getAdminClient } from "@/lib/auth/admin-client"
import { getWorkStart } from "@/lib/runtime-config"

export default async function AdminSettingsPage() {
  const admin = getAdminClient()
  const [{ data: configRows }, workStart] = await Promise.all([
    admin.from("hr_runtime_config").select("key, value, updated_at"),
    getWorkStart(),
  ])

  const groupId =
    configRows?.find((r) => r.key === "hr_line_group_id")?.value ??
    process.env.HR_LINE_GROUP_ID ??
    "—"

  const checks = [
    { label: "Supabase URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { label: "LINE Channel", ok: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN) },
    { label: "Public Base URL", ok: Boolean(process.env.NEXT_PUBLIC_BASE_URL) },
    { label: "HR LINE Group", ok: Boolean(groupId && groupId !== "—") },
  ]

  return (
    <AdminPageShell title="Settings" description="สถานะการตั้งค่าระบบและ CNV WorkHub">
      <div className="grid gap-4">
        <SettingsPanel
          rows={configRows ?? []}
          envWorkHour={String(workStart.hour)}
          envWorkMinute={String(workStart.minute)}
        />
        <MorningPushSettingsPanel rows={configRows ?? []} />
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-semibold">เวลาเริ่มงานสำรองที่ใช้งานอยู่</h3>
            <p className="text-sm">
              {workStart.hour}:{String(workStart.minute).padStart(2, "0")} ICT
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              ใช้เฉพาะกรณีไม่มีกะหรือไม่มีเวลาเข้างานส่วนตัว · LINE User Chat:{" "}
              {process.env.LINE_USER_CHAT_ENABLED === "true" ? "เปิด" : "ปิด"}
            </p>
          </section>
          <section className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-semibold">Health checks</h3>
            <ul className="space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex justify-between">
                  <span>{c.label}</span>
                  <span className={c.ok ? "text-green-600" : "text-amber-600"}>
                    {c.ok ? "OK" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AdminPageShell>
  )
}
