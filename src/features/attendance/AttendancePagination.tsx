"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ATTENDANCE_PAGE_SIZE } from "@/features/attendance/types"

export function AttendancePagination({
  page,
  total,
}: {
  page: number
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / ATTENDANCE_PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * ATTENDANCE_PAGE_SIZE + 1
  const end = Math.min(page * ATTENDANCE_PAGE_SIZE, total)

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(target))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {total === 0 ? "ยังไม่มีผลลัพธ์" : `แสดง ${start}-${end} จาก ${total} รายการ`}
        </p>
        <p className="text-xs text-muted-foreground">หน้า {page} จาก {totalPages}</p>
      </div>
      <div className="flex gap-2 self-start sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          ก่อนหน้า
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          ถัดไป
        </Button>
      </div>
    </div>
  )
}
