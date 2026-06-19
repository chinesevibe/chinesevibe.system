"use client"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { useLocale } from "@/features/portal/LocaleProvider"
import {
  LeaveBalanceCard,
  type LeaveBalance,
} from "@/features/leave/LeaveBalanceCard"
import { LeaveForm } from "@/features/leave/LeaveForm"

export function LeaveLiffContent({
  balances,
  employeeName,
}: {
  balances: LeaveBalance[]
  employeeName: string
}) {
  const { tx } = useLocale()

  return (
    <LiffPageShell
      title={tx("leave.page.title")}
      subtitle={employeeName}
    >
      <div className="flex flex-col gap-4 p-4">
        <LeaveBalanceCard balances={balances} />
        <LeaveForm />
      </div>
      <LiffBottomNav />
    </LiffPageShell>
  )
}
