"use client"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { useLocale } from "@/features/portal/LocaleProvider"
import { DocumentRequestForm } from "@/features/documents/DocumentRequestForm"

export function DocumentsLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <LiffPageShell
      title={tx("doc.page.title")}
      subtitle={employeeName}
    >
      <div className="p-4">
        <DocumentRequestForm />
      </div>
      <LiffBottomNav />
    </LiffPageShell>
  )
}
