import assert from "node:assert/strict"
import test from "node:test"

import { departmentsForBranch } from "@/features/employees/organization-filter"

test("departmentsForBranch falls back to all departments when selected branch has none", () => {
  const departments = [
    { id: "a", name: "Front of House", branch_id: "other-branch" },
    { id: "b", name: "Back of House", branch_id: "other-branch" },
  ]

  assert.deepEqual(departmentsForBranch(departments, "bang-na"), departments)
})
