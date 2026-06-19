"use client"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { useLocale } from "@/features/portal/LocaleProvider"
import { ComplaintForm } from "@/features/complaints/ComplaintForm"

export function ComplaintLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <LiffPageShell
      title={tx("complaint.page.title")}
      subtitle={employeeName}
    >
      <div className="p-4">
        <ComplaintForm />
      </div>
      <LiffBottomNav />
    </LiffPageShell>
  )
}
