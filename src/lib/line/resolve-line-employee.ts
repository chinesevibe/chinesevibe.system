import { getAdminClient } from "@/lib/auth/admin-client"

export type LineEmployeeLookup =
  | { state: "none" }
  | { state: "pending"; name: string }
  | { state: "active"; id: string; name: string }

export async function resolveLineEmployee(
  lineUserId: string
): Promise<LineEmployeeLookup> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_employees")
    .select("id, name, status")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!data) return { state: "none" }
  if (data.status !== "active") {
    return { state: "pending", name: data.name }
  }
  return { state: "active", id: data.id, name: data.name }
}
