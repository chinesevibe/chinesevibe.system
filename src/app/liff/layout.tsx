import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { PendingRegistrationCard } from "@/components/auth/PendingRegistrationCard"
import { LiffLocaleSync } from "@/components/liff/LiffLocaleSync"
import { LiffLocaleShell } from "@/features/liff/LiffLocaleShell"
import { isPendingRegistration } from "@/lib/auth/employee-access"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale, LOCALE_COOKIE } from "@/lib/i18n/types"

export default async function LiffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const initialLocale = coerceLocale(cookieLocale ?? employee?.preferred_locale)

  if (employee && isPendingRegistration(employee)) {
    return (
      <LiffLocaleShell initialLocale={initialLocale}>
        <LiffLocaleSync />
        <PendingRegistrationCard name={employee.name} />
      </LiffLocaleShell>
    )
  }

  if (employee && employee.status !== "active") {
    redirect("/login?error=session_failed")
  }

  return (
    <LiffLocaleShell initialLocale={initialLocale}>
      <LiffLocaleSync />
      {children}
    </LiffLocaleShell>
  )
}
