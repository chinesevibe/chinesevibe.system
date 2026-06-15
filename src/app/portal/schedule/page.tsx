import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { WidgetCard } from "@/components/brand/WidgetCard"

export default function PortalSchedulePage() {
  return (
    <AdminPageShell title="ตารางงาน" description="My Schedule (T102 lite)">
      <WidgetCard title="ตารางงาน">
        <p className="text-sm text-muted-foreground">
          ดูประวัติการเข้างานได้ที่{" "}
          <Link href="/portal/attendance" className="text-brand-red underline">
            การเข้างาน
          </Link>
          {" "}· ขอ OT / ลา ใช้ทางลัด LIFF จากหน้าหลัก
        </p>
      </WidgetCard>
    </AdminPageShell>
  )
}
