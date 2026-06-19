"use client"

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

const DISPLAY_LEAVE_TYPES = LEAVE_TYPES.filter((t) => t !== "other")

export function LeaveBalanceCard({ balances }: { balances: LeaveBalance[] }) {
  const { tx } = useLocale()
  const byType = new Map(balances.map((b) => [b.leave_type, b]))

  const totalRemaining = DISPLAY_LEAVE_TYPES.reduce((sum, type) => {
    const b = byType.get(type)
    return sum + (b ? b.total_days - b.used_days : 0)
  }, 0)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{tx("leave.balance.title")}</p>
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#E80012]">
          คงเหลือ {totalRemaining} วัน
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DISPLAY_LEAVE_TYPES.map((type) => {
          const balance = byType.get(type)
          const remaining = balance ? balance.total_days - balance.used_days : null
          return (
            <div key={type} className="rounded-lg bg-[#F5F5F5] px-3 py-2.5">
              <p className="text-xs text-gray-400">{tx(leaveTypeKey(type))}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums text-gray-900">
                  {remaining === null ? (
                    <span className="text-sm font-normal text-gray-300">–</span>
                  ) : (
                    remaining
                  )}
                </span>
                {remaining !== null && balance && (
                  <span className="text-xs text-gray-400">/ {balance.total_days} วัน</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
