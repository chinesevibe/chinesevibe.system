"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import { LEAVE_TYPES, type LeaveType } from "@/features/leave/types"
import type { MessageKey } from "@/lib/i18n/messages"

export type LeaveBalance = {
  leave_type: string
  total_days: number
  used_days: number
}

function leaveTypeKey(type: LeaveType): MessageKey {
  return `leave.type.${type}` as MessageKey
}

const DISPLAY_LEAVE_TYPES = LEAVE_TYPES.filter((type) => type !== "other")

export function LeaveBalanceCard({ balances }: { balances: LeaveBalance[] }) {
  const { tx } = useLocale()
  const byType = new Map(balances.map((b) => [b.leave_type, b]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("leave.balance.title")}</CardTitle>
        <CardDescription>{tx("leave.balance.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DISPLAY_LEAVE_TYPES.map((type) => {
            const balance = byType.get(type)
            const remaining = balance
              ? balance.total_days - balance.used_days
              : null
            return (
              <div key={type} className="rounded-lg bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">
                  {tx(leaveTypeKey(type))}
                </dt>
                <dd className="mt-1 text-lg font-medium tabular-nums">
                  {remaining === null ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {tx("leave.balance.notSet")}
                    </span>
                  ) : (
                    <>
                      {remaining}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        / {balance!.total_days} {tx("leave.balance.daysUnit")}
                      </span>
                    </>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}
