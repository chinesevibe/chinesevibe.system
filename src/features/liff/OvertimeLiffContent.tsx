"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import { OvertimeForm } from "@/features/overtime/OvertimeForm"

export function OvertimeLiffContent({ employeeName }: { employeeName: string }) {
  const { tx } = useLocale()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tx("ot.page.title")}</CardTitle>
          <CardDescription>
            {tx("ot.page.subtitle", { name: employeeName })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OvertimeForm />
        </CardContent>
      </Card>
    </main>
  )
}
