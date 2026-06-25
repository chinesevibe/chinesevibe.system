import assert from "node:assert/strict"
import test from "node:test"

import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-1",
    line_user_id: "line-1",
    name: "Test",
    position: null,
    department: null,
    branch_id: null,
    work_shift_id: null,
    role: "employee",
    status: "active",
    avatar_path: null,
    avatarUrl: null,
    preferred_locale: "th",
    ...overrides,
  }
}

test("canAccessPortalInventoryWorkspace allows inventory workers and blocks unrelated employees", () => {
  assert.equal(
    canAccessPortalInventoryWorkspace(
      employee({ department: "Inventory", role: "employee" })
    ),
    true
  )
  assert.equal(
    canAccessPortalInventoryWorkspace(
      employee({ department: "Back of House", role: "employee" })
    ),
    false
  )
})

test("canAccessPortalInventoryWorkspace allows inventory managers into the mobile workspace", () => {
  assert.equal(
    canAccessPortalInventoryWorkspace(
      employee({
        department: "Inventory",
        position: "Inventory Manager",
        role: "employee",
      })
    ),
    true
  )
  assert.equal(
    canAccessPortalInventoryWorkspace(
      employee({
        department: "Inventory",
        position: "Inventory Manager",
        role: "inventory",
      })
    ),
    true
  )
})

test("canAccessPortalInventoryWorkspace keeps dev access for QA", () => {
  assert.equal(canAccessPortalInventoryWorkspace(employee({ role: "dev" })), true)
})
