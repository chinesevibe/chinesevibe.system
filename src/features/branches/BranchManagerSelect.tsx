"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import type { BranchManagerCandidate } from "@/features/branches/manager-candidates"
import { cn } from "@/lib/utils"

function candidateLabel(candidate: BranchManagerCandidate): string {
  const parts = [candidate.name]
  if (candidate.employee_code) parts.push(`(${candidate.employee_code})`)
  if (candidate.department) parts.push(`· ${candidate.department}`)
  return parts.join(" ")
}

export function BranchManagerSelect({
  branchId,
  value,
  candidates,
  readOnly = false,
  className,
}: {
  branchId: string
  value: string | null
  candidates: BranchManagerCandidate[]
  readOnly?: boolean
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (readOnly) {
    const selected = candidates.find((c) => c.id === value)
    return (
      <span className={cn("text-sm", className)}>
        {selected ? selected.name : "ยังไม่มอบหมาย"}
      </span>
    )
  }

  async function onChange(nextValue: string) {
    setError(null)
    const managerEmployeeId = nextValue || null

    const res = await fetch(`/api/branches/${branchId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ managerEmployeeId }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string }
    if (!res.ok) {
      setError(data?.error ?? "บันทึกไม่สำเร็จ")
      return
    }

    startTransition(() => router.refresh())
  }

  return (
    <div className={cn("min-w-[12rem]", className)}>
      <select
        className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
        value={value ?? ""}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value)}
        aria-label="เลือกผู้ดูแลสาขา"
      >
        <option value="">— ยังไม่มอบหมาย —</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidateLabel(candidate)}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
