import { redirect } from "next/navigation"

import { getCurrentEmployee } from "@/lib/auth/session"
import { isRealLineId } from "@/lib/auth/line-user-id"
import { coerceLocale } from "@/lib/i18n/types"

import ClockPageClient from "./page-client"

export default async function ClockPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const employee = await getCurrentEmployee()
  const locale = coerceLocale(lang)

  if (!employee || !isRealLineId(employee.line_user_id)) {
    const params = new URLSearchParams({
      lang: locale,
      next: `/liff/clock?lang=${locale}`,
    })
    redirect(`/api/auth/line/start?${params.toString()}`)
  }

  return <ClockPageClient />
}
