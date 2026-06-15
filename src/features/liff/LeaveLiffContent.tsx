"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <LeaveBalanceCard balances={balances} />
      <Card>
        <CardHeader>
          <CardTitle>{tx("leave.page.title")}</CardTitle>
          <CardDescription>{employeeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveForm />
        </CardContent>
      </Card>
    </main>
  )
}
