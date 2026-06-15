"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { LEAVE_PAGE_SIZE } from "@/features/leaves/types"

export function LeavePagination({
  page,
  total,
}: {
  page: number
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / LEAVE_PAGE_SIZE))

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(target))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        หน้า {page} / {totalPages} ({total} รายการ)
      </span>
      <div className="flex gap-2">
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
