"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  MORNING_PUSH_DEFAULTS,
  parseMorningPushFromRows,
  serializeMorningPushPatch,
  type MorningPushGroup,
  type MorningPushGroupConfig,
  type RuntimeConfigRow,
} from "@/lib/settings/morning-push-config"

const DAY_OPTIONS = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 7, label: "อา" },
] as const

const CARD_LABELS: Record<MorningPushGroup, string> = {
  employee: "Employee",
  officer: "Officer",
}

function GroupCard({
  label,
  config,
  onChange,
}: {
  label: string
  config: MorningPushGroupConfig
  onChange: (next: MorningPushGroupConfig) => void
}) {
  return (
    <section className="rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{label}</h4>
          <p className="text-xs text-muted-foreground">
            เวลาจริงใช้กะงานในโปรไฟล์พนักงานก่อน และถ้าไม่มีให้สรุปแจ้งเตือนวันละ
            1 รอบตามเวลานี้
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          />
          <span>เปิดใช้งาน</span>
        </label>
      </div>

      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">
            เวลาแจ้งเตือนรวม (HH:MM)
          </span>
          <input
            type="time"
            className="h-9 w-full rounded-lg border px-2"
            value={config.fallbackTime}
            onChange={(e) =>
              onChange({ ...config, fallbackTime: e.target.value })
            }
          />
        </label>
      </div>

      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">
            เตือนหลังเริ่มงาน (นาที)
          </span>
          <input
            type="number"
            min="0"
            max="120"
            className="h-9 w-full rounded-lg border px-2"
            value={String(config.remindAfterMin)}
            onChange={(e) =>
              onChange({
                ...config,
                remindAfterMin: Number.parseInt(e.target.value || "0", 10) || 0,
              })
            }
          />
        </label>

        <div className="text-sm">
          <span className="mb-2 block text-muted-foreground">วันทำงาน</span>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((day) => {
              const checked = config.days.includes(day.value)
              return (
                <label
                  key={day.value}
                  className="flex min-w-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const nextDays = e.target.checked
                        ? [...config.days, day.value]
                        : config.days.filter((value) => value !== day.value)
                      onChange({
                        ...config,
                        days: [...new Set(nextDays)].sort((a, b) => a - b),
                      })
                    }}
                  />
                  <span>{day.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function MorningPushSettingsPanel({ rows }: { rows: RuntimeConfigRow[] }) {
  const router = useRouter()
  const initialConfig = useMemo(() => parseMorningPushFromRows(rows), [rows])
  const [employeeConfig, setEmployeeConfig] = useState(initialConfig.employee)
  const [officerConfig, setOfficerConfig] = useState(initialConfig.officer)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const body = {
        ...serializeMorningPushPatch("employee", employeeConfig),
        ...serializeMorningPushPatch("officer", officerConfig),
      }
      const res = await fetch("/api/settings/runtime", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(payload?.error ?? "บันทึกไม่สำเร็จ")
      }
      setMessage("บันทึก Morning Push แล้ว")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  const hasChanges =
    JSON.stringify(employeeConfig) !== JSON.stringify(initialConfig.employee) ||
    JSON.stringify(officerConfig) !== JSON.stringify(initialConfig.officer)

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">CNV WorkHub — Morning Push</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ตั้งค่าเตือน LINE แยกสำหรับ Employee และ Officer วันละ 1 รอบจากหน้าเดียว
          </p>
        </div>
        <Button size="sm" disabled={busy || !hasChanges} onClick={save}>
          {busy ? "…" : "บันทึก Morning Push"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GroupCard
          label={CARD_LABELS.employee}
          config={employeeConfig}
          onChange={setEmployeeConfig}
        />
        <GroupCard
          label={CARD_LABELS.officer}
          config={officerConfig}
          onChange={setOfficerConfig}
        />
      </div>

      {message ? <p className="mt-3 text-sm text-green-600">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {!hasChanges ? (
        <p className="mt-3 text-xs text-muted-foreground">
          ค่า default เมื่อยังไม่ตั้ง: แจ้งเตือน {MORNING_PUSH_DEFAULTS.employee.fallbackTime} ·
          remind {MORNING_PUSH_DEFAULTS.employee.remindAfterMin} นาที · วันทำงาน จ-ศ
        </p>
      ) : null}
    </section>
  )
}
