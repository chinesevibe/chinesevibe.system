"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { ADMIN_SIDEBAR_WIDTH_CLASS } from "@/components/admin/admin-layout"
import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav"
import { AdminNavLinks } from "@/components/admin/AdminSidebar"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"

export function AdminMobileNav({
  groups,
  items,
  branchMode = false,
  inventoryMode = false,
  devAllMode = false,
}: {
  groups?: AdminNavGroup[]
  items?: AdminNavItem[]
  branchMode?: boolean
  inventoryMode?: boolean
  devAllMode?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">เปิดเมนู</span>
          </Button>
        }
      />
      <SheetContent side="left" className={cn(ADMIN_SIDEBAR_WIDTH_CLASS, "p-0")}>
        <SheetHeader className="border-b px-5 py-6">
          <BrandMark variant="sidebar" />
        </SheetHeader>
        <div className="py-4">
          <AdminNavLinks
            groups={groups}
            items={items}
            branchMode={branchMode}
            inventoryMode={inventoryMode}
            devAllMode={devAllMode}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
