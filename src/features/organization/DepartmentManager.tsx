"use client"

import { Briefcase, Building2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { CountBadge } from "@/components/brand/CountBadge"
import { WidgetCard } from "@/components/brand/WidgetCard"
import { Button } from "@/components/ui/button"
import type { OrganizationDepartment } from "@/features/organization/data"
import { cn } from "@/lib/utils"

const inputClass =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

function AddPositionForm({
  departmentId,
  disabled,
}: {
  departmentId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addPosition() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), department_id: departmentId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "เพิ่มตำแหน่งไม่สำเร็จ")
      }
      setName("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "เพิ่มตำแหน่งไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 border-t border-dashed border-border/80 pt-3">
      <div className="flex gap-2">
        <input
          className={cn(inputClass, "min-w-0 flex-1")}
          placeholder="ชื่อตำแหน่งใหม่"
          value={name}
          disabled={disabled || busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void addPosition()
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1"
          disabled={disabled || busy || !name.trim()}
          onClick={() => void addPosition()}
        >
          <Plus className="size-4" />
          เพิ่มตำแหน่ง
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function DepartmentManager({
  rows,
  canManage = false,
}: {
  rows: OrganizationDepartment[]
  canManage?: boolean
}) {
  const router = useRouter()
  const [deptName, setDeptName] = useState("")
  const [deptBusy, setDeptBusy] = useState(false)
  const [deptError, setDeptError] = useState<string | null>(null)

  async function deleteDepartment(dept: OrganizationDepartment) {
    if (
      !window.confirm(
        `ลบแผนก "${dept.name}" และตำแหน่งทั้งหมดในแผนกนี้?\n(ลบได้เมื่อไม่มีพนักงาน active ในแผนก)`
      )
    ) {
      return
    }
    setDeptBusy(true)
    setDeptError(null)
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "ลบแผนกไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setDeptError(e instanceof Error ? e.message : "ลบแผนกไม่สำเร็จ")
    } finally {
      setDeptBusy(false)
    }
  }

  async function deletePosition(pos: OrganizationDepartment["positions"][number]) {
    if (
      !window.confirm(
        `ลบตำแหน่ง "${pos.name}"?\n(ลบได้เมื่อไม่มีพนักงาน active ในตำแหน่งนี้)`
      )
    ) {
      return
    }
    setDeptBusy(true)
    setDeptError(null)
    try {
      const res = await fetch(`/api/positions/${pos.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "ลบตำแหน่งไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setDeptError(e instanceof Error ? e.message : "ลบตำแหน่งไม่สำเร็จ")
    } finally {
      setDeptBusy(false)
    }
  }

  async function addDepartment() {
    if (!deptName.trim()) return
    setDeptBusy(true)
    setDeptError(null)
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: deptName.trim() }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "เพิ่มแผนกไม่สำเร็จ")
      }
      setDeptName("")
      router.refresh()
    } catch (e) {
      setDeptError(e instanceof Error ? e.message : "เพิ่มแผนกไม่สำเร็จ")
    } finally {
      setDeptBusy(false)
    }
  }

  const totalPositions = rows.reduce((sum, d) => sum + d.positions.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CountBadge count={rows.length} label="แผนก" />
        <CountBadge count={totalPositions} label="ตำแหน่ง" />
      </div>

      {canManage ? (
        <WidgetCard title="เพิ่มแผนก" compact>
          <div className="space-y-2 p-3">
            <p className="text-xs text-muted-foreground">
              สร้างแผนกก่อน แล้วค่อยเพิ่มตำแหน่งภายใต้แผนกนั้น — ใช้ใน dropdown ตอนเพิ่ม/แก้ไขพนักงาน
            </p>
            <div className="flex gap-2">
              <input
                className={cn(inputClass, "min-w-0 flex-1")}
                placeholder="ชื่อแผนกใหม่ เช่น HR, Sales"
                value={deptName}
                disabled={deptBusy}
                onChange={(e) => setDeptName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void addDepartment()
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1 bg-brand-red text-white hover:bg-brand-red/90"
                disabled={deptBusy || !deptName.trim()}
                onClick={() => void addDepartment()}
              >
                <Building2 className="size-4" />
                เพิ่มแผนก
              </Button>
            </div>
            {deptError ? <p className="text-xs text-destructive">{deptError}</p> : null}
          </div>
        </WidgetCard>
      ) : (
        <p className="text-sm text-muted-foreground">
          ดูโครงสร้างได้อย่างเดียว — ต้องใช้บัญชี HR/Admin ในการเพิ่มแผนกและตำแหน่ง
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีแผนก — เพิ่มแผนกด้านบนเพื่อเริ่มจัดโครงสร้าง
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((dept) => (
            <WidgetCard
              key={dept.id}
              title={`${dept.name} · ${dept.employeeCount} คน`}
              compact
            >
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="size-3.5 shrink-0" />
                    <span>
                      {dept.positions.length > 0
                        ? `${dept.positions.length} ตำแหน่ง`
                        : "ยังไม่มีตำแหน่งในแผนกนี้"}
                    </span>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-muted-foreground hover:text-destructive"
                      disabled={deptBusy}
                      onClick={() => void deleteDepartment(dept)}
                    >
                      <Trash2 className="size-3.5" />
                      ลบแผนก
                    </Button>
                  ) : null}
                </div>

                {dept.positions.length > 0 ? (
                  <ul className="divide-y rounded-lg border border-border/80">
                    {dept.positions.map((pos) => (
                      <li
                        key={pos.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{pos.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {pos.employeeCount} คน
                          </span>
                          {canManage ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              disabled={deptBusy}
                              aria-label={`ลบตำแหน่ง ${pos.name}`}
                              onClick={() => void deletePosition(pos)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    เพิ่มตำแหน่งด้านล่าง — เช่น Officer, Manager, Staff
                  </p>
                )}

                {canManage ? (
                  <AddPositionForm departmentId={dept.id} disabled={deptBusy} />
                ) : null}
              </div>
            </WidgetCard>
          ))}
        </div>
      )}
    </div>
  )
}
