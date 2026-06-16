import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AuthPageShell } from "@/features/auth/AuthPageShell"
import { RegisterForm } from "@/features/auth/RegisterForm"
import { RegisterLineProvider } from "@/features/auth/RegisterLineProvider"
import { isPendingRegistration } from "@/lib/auth/employee-access"
import { adminLoginPath } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale, LOCALE_COOKIE } from "@/lib/i18n/types"

export default async function RegisterPage() {
  const employee = await getCurrentEmployee()
  if (employee) {
    if (isPendingRegistration(employee)) {
      redirect("/register/pending")
    }
    if (employee.status === "active") {
      redirect(
        adminLoginPath(
          employee.role,
          employee.status,
          employee.department,
          employee.position
        )
      )
    }
  }

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const initialLocale = coerceLocale(
    cookieLocale ?? employee?.preferred_locale
  )

  return (
    <AuthPageShell initialLocale={initialLocale} titleKey="auth.register.title">
      <RegisterLineProvider>
        <RegisterForm />
      </RegisterLineProvider>
    </AuthPageShell>
  )
}
