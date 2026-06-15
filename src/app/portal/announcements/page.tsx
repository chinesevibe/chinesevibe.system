import Image from "next/image"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getEmployeeAnnouncements } from "@/features/portal/data"
import { getCurrentEmployee } from "@/lib/auth/session"
import { formatThaiDate } from "@/lib/datetime/thailand"

function formatSentAt(iso: string | null): string {
  return formatThaiDate(iso, { day: "numeric", month: "long", year: "numeric" })
}

export default async function PortalAnnouncementsPage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const announcements = await getEmployeeAnnouncements(employee.department)

  return (
    <AdminPageShell title="ประกาศ" description="ประกาศจาก HR ที่เกี่ยวข้องกับคุณ">
      {announcements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          ยังไม่มีประกาศ
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {announcements.map((item) => (
            <li key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                <time className="text-xs text-muted-foreground">
                  {formatSentAt(item.sentAt)}
                </time>
              </div>
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={640}
                  height={360}
                  unoptimized
                  className="mt-3 max-h-80 w-full rounded-lg border object-contain"
                />
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  )
}
