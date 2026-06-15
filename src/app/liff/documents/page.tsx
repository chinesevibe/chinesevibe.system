import { DocumentsLiffContent } from "@/features/liff/DocumentsLiffContent"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function DocumentsLiffPage() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    return <LiffLoginPrompt titleKey="doc.page.title" />
  }

  return <DocumentsLiffContent employeeName={employee.name} />
}
