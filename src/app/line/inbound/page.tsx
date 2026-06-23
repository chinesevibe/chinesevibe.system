import { redirect } from "next/navigation"

import { resolveInventoryEntryPath } from "@/lib/line/inventory-entry"
import { getCurrentEmployee } from "@/lib/auth/session"

function withLang(path: string, lang?: string) {
  if (!lang) return path
  const params = new URLSearchParams({ lang })
  return `${path}?${params.toString()}`
}

export default async function LineInboundEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const employee = await getCurrentEmployee()
  const { lang } = await searchParams

  if (!employee) {
    const params = new URLSearchParams({ next: "/line/inbound" })
    if (lang) params.set("lang", lang)
    redirect(`/api/auth/line/start?${params.toString()}`)
  }

  redirect(withLang(resolveInventoryEntryPath(employee, "inbound"), lang))
}
