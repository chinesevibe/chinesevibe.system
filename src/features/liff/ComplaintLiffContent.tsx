"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import { ComplaintForm } from "@/features/complaints/ComplaintForm"

export function ComplaintLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tx("complaint.page.title")}</CardTitle>
          <CardDescription>{employeeName}</CardDescription>
        </CardHeader>
        <CardContent>
          <ComplaintForm />
        </CardContent>
      </Card>
    </main>
  )
}
