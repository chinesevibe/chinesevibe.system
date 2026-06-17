"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { DataTableShell } from "@/components/brand/DataTableShell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LEAVE_ADVANCE_NOTICE, LEAVE_TYPE_LABELS, LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import type { EmployeeBalanceRow } from "@/features/leaves/insights"
import type { EditableEmployeeLeaveBalance, LeavePolicyRow } from "@/features/leaves/policy"

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

function formatDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function buildEditableBalances(
  row: EmployeeBalanceRow,
  policies: LeavePolicyRow[]
): EditableEmployeeLeaveBalance[] {
  const byType = new Map(row.balances.map((balance) => [balance.type, balance]))
  const byPolicy = new Map(policies.map((policy) => [policy.leaveType, policy.annualDays]))

  return LEAVE_TYPES.map((type) => {
    const current = byType.get(type)
    const total = current?.total ?? (byPolicy.get(type) ?? 0)
    const used = current?.used ?? 0
    return {
      type,
      typeLabel: LEAVE_TYPE_LABELS[type],
      total,
      used,
      remaining: total - used,
      policyDefault: byPolicy.get(type) ?? 0,
    }
  })
}

function LeavePolicyCard({ policies }: { policies: LeavePolicyRow[] }) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<LeaveType>(policies[0]?.leaveType ?? "sick")
  const [annualDays, setAnnualDays] = useState(
    String(policies.find((policy) => policy.leaveType === (policies[0]?.leaveType ?? "sick"))?.annualDays ?? 0)
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byType = useMemo(
    () => new Map(policies.map((policy) => [policy.leaveType, policy])),
    [policies]
  )

  async function save() {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const parsed = Number(annualDays)
      const res = await fetch("/api/leave/policy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leaveType: selectedType, annualDays: parsed }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      }
      setMessage("บันทึกนโยบายวันลาแล้ว")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">ตั้งค่านโยบายวันลา</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ใช้เป็นค่าเริ่มต้นสำหรับพนักงานใหม่หรือประเภทลาที่ยังไม่เคยตั้งยอด
            </p>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">ประเภทลา</span>
            <select
              className={fieldClass}
              value={selectedType}
              onChange={(e) => {
                const next = e.target.value as LeaveType
                setSelectedType(next)
                setAnnualDays(String(byType.get(next)?.annualDays ?? 0))
              }}
            >
              {LEAVE_TYPES.filter((type) => type !== "other").map((type) => (
                <option key={type} value={type}>
                  {LEAVE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">จำนวนวันต่อปี</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={fieldClass}
              value={annualDays}
              onChange={(e) => setAnnualDays(e.target.value)}
            />
          </label>
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button size="sm" disabled={busy} onClick={save}>
            {busy ? "…" : "บันทึก policy"}
          </Button>
        </div>

        <div className="rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ประเภทลา</TableHead>
                <TableHead>แจ้งล่วงหน้า</TableHead>
                <TableHead className="text-right">โควตาต่อปี</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.filter((policy) => policy.leaveType !== "other").map((policy) => (
                <TableRow key={policy.leaveType}>
                  <TableCell>{policy.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {LEAVE_ADVANCE_NOTICE[policy.leaveType]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDays(policy.annualDays)} วัน
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}

function EmployeeBalanceDialog({
  row,
  policies,
  onClose,
}: {
  row: EmployeeBalanceRow
  policies: LeavePolicyRow[]
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditableEmployeeLeaveBalance[]>(
    () => buildEditableBalances(row, policies)
  )

  function applyPolicyDefaults() {
    setDraft((current) =>
      current.map((entry) => ({
        ...entry,
        total: entry.policyDefault,
        remaining: entry.policyDefault - entry.used,
      }))
    )
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const balances = draft.map((entry) => ({
        leaveType: entry.type,
        totalDays: Number(entry.total),
      }))
      const res = await fetch("/api/leave/balances", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId: row.employeeId, balances }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      }
      onClose()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>แก้ยอดวันลา</DialogTitle>
          <DialogDescription>
            {`${row.employeeName} · ${row.department ?? "ไม่ระบุแผนก"}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={applyPolicyDefaults}>
            กรอกจาก policy
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ประเภทลา</TableHead>
                <TableHead className="text-right">Policy กลาง</TableHead>
                <TableHead className="text-right">ใช้ไปแล้ว</TableHead>
                <TableHead className="w-40 text-right">ตั้งยอดรวม</TableHead>
                <TableHead className="text-right">คงเหลือ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.map((entry, index) => (
                <TableRow key={entry.type}>
                  <TableCell>{entry.typeLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDays(entry.policyDefault)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDays(entry.used)}
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${fieldClass} text-right tabular-nums`}
                      value={String(entry.total)}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        setDraft((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  total: Number.isFinite(next) ? next : 0,
                                  remaining: (Number.isFinite(next) ? next : 0) - item.used,
                                }
                              : item
                          )
                        )
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDays(entry.remaining)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy ? "…" : "บันทึกยอดวันลา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LeaveBalancesTable({
  rows,
  policies,
}: {
  rows: EmployeeBalanceRow[]
  policies: LeavePolicyRow[]
}) {
  const [selectedRow, setSelectedRow] = useState<EmployeeBalanceRow | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <LeavePolicyCard policies={policies} />

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          ไม่มีข้อมูลยอดลา
        </p>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>พนักงาน</TableHead>
                <TableHead>แผนก</TableHead>
                {LEAVE_TYPES.filter((t) => t !== "other").map((t) => (
                  <TableHead key={t}>{LEAVE_TYPE_LABELS[t]}</TableHead>
                ))}
                <TableHead className="w-24 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const byType = new Map(row.balances.map((b) => [b.type, b]))
                return (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="font-medium text-brand-red underline-offset-4 hover:underline"
                      >
                        {row.employeeName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.department ?? "—"}</TableCell>
                    {LEAVE_TYPES.filter((t) => t !== "other").map((t) => {
                      const b = byType.get(t)
                      return (
                        <TableCell key={t} className="text-sm tabular-nums">
                          {b ? (
                            <>
                              {formatDays(b.remaining)}
                              <span className="text-muted-foreground">
                                {" "}
                                / {formatDays(b.total)}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRow(row)}>
                        แก้ไข
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {selectedRow ? (
        <EmployeeBalanceDialog
          key={selectedRow.employeeId}
          row={selectedRow}
          policies={policies}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}
    </div>
  )
}
