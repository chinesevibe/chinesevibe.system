import Link from "next/link"

import { Button } from "@/components/ui/button"

export function PendingRegistrationCard({
  name,
  showLoginHint = false,
}: {
  name?: string
  showLoginHint?: boolean
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-lg">
        <p className="text-center text-lg font-semibold text-foreground">
          รอ HR อนุมัติการลงทะเบียน
        </p>
        {name ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {name}
          </p>
        ) : null}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ส่งคำขอแล้ว — ทีม HR จะตรวจสอบชื่อ เบอร์ติดต่อ และสาขา
          ก่อนเปิดใช้งานเมนู HR ใน LINE
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          <li>ยังไม่สามารถเช็คอิน / ขอลาได้จนกว่าจะอนุมัติ</li>
          <li>พนักงานใช้งานผ่าน LINE OA — ไม่มี Web Dashboard</li>
        </ul>
        {showLoginHint ? (
          <Button
            render={<Link href="/login" />}
            variant="outline"
            className="mt-6 w-full"
          >
            กลับหน้า Login
          </Button>
        ) : null}
      </div>
    </main>
  )
}
