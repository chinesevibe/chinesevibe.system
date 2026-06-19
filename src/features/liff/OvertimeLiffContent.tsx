"use client"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { useLocale } from "@/features/portal/LocaleProvider"
import { OvertimeForm } from "@/features/overtime/OvertimeForm"

export function OvertimeLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <LiffPageShell
      title={tx("ot.page.title")}
      subtitle={tx("ot.page.subtitle", { name: employeeName })}
    >
      <div className="p-4">
        <OvertimeForm />
      </div>
      <LiffBottomNav />
    </LiffPageShell>
  )
}
