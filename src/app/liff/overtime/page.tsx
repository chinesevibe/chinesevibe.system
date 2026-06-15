import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { OvertimeLiffContent } from "@/features/liff/OvertimeLiffContent"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function OvertimeLiffPage() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="ot.page.menuTitle" />
  }

  return <OvertimeLiffContent employeeName={employee.name} />
}
