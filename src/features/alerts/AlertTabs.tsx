"use client"

import { BrandTabs } from "@/components/brand/BrandTabs"
import type { AlertTab } from "@/features/alerts/types"

const TABS: Array<{ id: AlertTab; label: string }> = [
  { id: "probation", label: "ทดลองงาน" },
  { id: "visa", label: "วีซ่า" },
  { id: "work_permit", label: "Work Permit" },
]

export function AlertTabs({ active }: { active: AlertTab }) {
  return <BrandTabs tabs={TABS} active={active} param="tab" />
}
