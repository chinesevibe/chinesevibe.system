import { ComplaintLiffContent } from "@/features/liff/ComplaintLiffContent"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function ComplaintLiffPage() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="complaint.page.title" />
  }

  return <ComplaintLiffContent employeeName={employee.name} />
}
