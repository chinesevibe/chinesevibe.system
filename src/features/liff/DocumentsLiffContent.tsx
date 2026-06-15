"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import { DocumentRequestForm } from "@/features/documents/DocumentRequestForm"

export function DocumentsLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tx("doc.page.title")}</CardTitle>
          <CardDescription>{employeeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentRequestForm />
        </CardContent>
      </Card>
    </main>
  )
}
