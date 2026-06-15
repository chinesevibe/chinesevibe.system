import { employeeAvatarPublicUrl } from "@/lib/employees/avatar"
import { coerceLocale, type AppLocale } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

export type Employee = {
  id: string
  line_user_id: string | null
  name: string
  position: string | null
  department: string | null
  role: "employee" | "hr" | "admin" | "branch_manager" | "ceo" | "dev"
  status: "active" | "inactive"
  avatar_path: string | null
  avatarUrl: string | null
  preferred_locale: AppLocale
}

export type EmployeeUserChip = Pick<
  Employee,
  "name" | "role" | "position" | "avatarUrl"
>

// Reads the caller's own hr_employees row through their session client —
// RLS self-select via the line_user_id JWT claim. Returns null when not
// logged in or the auth user has no matching employee row.
export async function getCurrentEmployee(): Promise<Employee | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const lineUserId = user.app_metadata?.line_user_id
  if (typeof lineUserId !== "string" || !lineUserId) {
    return null
  }

  const { data } = await supabase
    .from("hr_employees")
    .select(
      "id, line_user_id, name, position, department, role, status, avatar_path, preferred_locale"
    )
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!data) return null

  const avatar_path = (data.avatar_path as string | null) ?? null
  return {
    id: data.id as string,
    line_user_id: data.line_user_id as string | null,
    name: data.name as string,
    position: (data.position as string | null) ?? null,
    department: (data.department as string | null) ?? null,
    role: data.role as Employee["role"],
    status: data.status as Employee["status"],
    avatar_path,
    avatarUrl: employeeAvatarPublicUrl(avatar_path),
    preferred_locale: coerceLocale(data.preferred_locale),
  }
}
