import Link from "next/link"

import { invInputClass } from "@/features/inventory/form-styles"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InventorySearchBar({
  basePath,
  search,
  placeholder,
}: {
  basePath: string
  search: string
  placeholder: string
}) {
  return (
    <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center" action={basePath}>
      <input
        name="search"
        placeholder={placeholder}
        defaultValue={search}
        className={invInputClass}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm">
          ค้นหา
        </Button>
        {search ? (
          <Link
            href={basePath}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ล้าง
          </Link>
        ) : null}
      </div>
    </form>
  )
}

export function InventoryLoadError({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  )
}
