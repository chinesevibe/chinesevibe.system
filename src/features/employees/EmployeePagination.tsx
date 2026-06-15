"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"

export function EmployeePagination({
  page,
  total,
  pageSize,
}: {
  page: number
  total: number
  pageSize: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(next))
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        ทั้งหมด {total} คน — หน้า {page}/{totalPages}
      </p>
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
