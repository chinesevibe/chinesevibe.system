"use client"

import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquareWarning,
  Network,
  Package,
  Settings,
  Target,
  Timer,
  UserSearch,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import type { AdminNavIconName } from "@/components/admin/admin-nav-types"

export const ADMIN_NAV_ICONS: Record<AdminNavIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  building: Building2,
  clock: Clock,
  calendar: CalendarDays,
  timer: Timer,
  wallet: Wallet,
  target: Target,
  "user-search": UserSearch,
  "graduation-cap": GraduationCap,
  "file-text": FileText,
  "message-warning": MessageSquareWarning,
  megaphone: Megaphone,
  "bar-chart": BarChart3,
  settings: Settings,
  "list-checks": ListChecks,
  organization: Network,
  branches: GitBranch,
  inventory: Package,
  bell: Bell,
}

export function resolveAdminNavIcon(name: AdminNavIconName): LucideIcon {
  return ADMIN_NAV_ICONS[name]
}

/** Stable icon renderer for client nav links (avoids dynamic component during render). */
export function AdminNavIcon({
  name,
  className,
}: {
  name: AdminNavIconName
  className?: string
}) {
  switch (name) {
    case "layout-dashboard":
      return <LayoutDashboard className={className} />
    case "users":
      return <Users className={className} />
    case "building":
      return <Building2 className={className} />
    case "clock":
      return <Clock className={className} />
    case "calendar":
      return <CalendarDays className={className} />
    case "timer":
      return <Timer className={className} />
    case "wallet":
      return <Wallet className={className} />
    case "target":
      return <Target className={className} />
    case "user-search":
      return <UserSearch className={className} />
    case "graduation-cap":
      return <GraduationCap className={className} />
    case "file-text":
      return <FileText className={className} />
    case "message-warning":
      return <MessageSquareWarning className={className} />
    case "megaphone":
      return <Megaphone className={className} />
    case "bar-chart":
      return <BarChart3 className={className} />
    case "settings":
      return <Settings className={className} />
    case "list-checks":
      return <ListChecks className={className} />
    case "organization":
      return <Network className={className} />
    case "branches":
      return <GitBranch className={className} />
    case "inventory":
      return <Package className={className} />
    case "bell":
      return <Bell className={className} />
    default:
      return <LayoutDashboard className={className} />
  }
}
