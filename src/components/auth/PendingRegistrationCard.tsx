import Link from "next/link"

import { Button } from "@/components/ui/button"
import { BRAND_LOGIN_HERO } from "@/lib/brand/assets"

export function PendingRegistrationCard({
  name,
  showLoginHint = false,
}: {
  name?: string
  showLoginHint?: boolean
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg">
        <div className="overflow-hidden bg-brand-red">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGIN_HERO}
            alt="CNV WorkHub"
            width={400}
            height={300}
            className="block h-auto w-full object-cover"
            decoding="async"
          />
        </div>
        <div className="p-6">
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
          <li>พนักงานใช้งานผ่าน CNV WorkHub บน LINE — ไม่มี Web Dashboard</li>
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
      </div>
    </main>
  )
}
