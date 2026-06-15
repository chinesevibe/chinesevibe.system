"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"

export function LiffLoginPrompt({ titleKey }: { titleKey: MessageKey }) {
  const { tx } = useLocale()

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{tx(titleKey)}</CardTitle>
          <CardDescription>{tx("liff.common.loginTitle")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            {tx("liff.common.notLoggedIn")}{" "}
            <a href="/login" className="underline">
              {tx("liff.common.login")}
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
