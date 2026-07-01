import assert from "node:assert/strict"
import test from "node:test"

import { normalizePersistedAdminContextTabsState } from "./admin-context-tabs-state"

test("dedupes stored tabs by id and keeps the latest copy", () => {
  const normalized = normalizePersistedAdminContextTabsState(
    {
      activeId: "/admin/employees",
      tabs: [
        {
          id: "/admin",
          href: "/admin",
          label: "แดชบอร์ด",
          closable: false,
          updatedAt: 10,
        },
        {
          id: "/admin/employees",
          href: "/admin/employees?sort=name",
          label: "พนักงาน",
          closable: true,
          updatedAt: 20,
        },
        {
          id: "/admin/employees",
          href: "/admin/employees?sort=code",
          label: "พนักงาน",
          closable: true,
          updatedAt: 30,
        },
      ],
    },
    10
  )

  assert.deepEqual(normalized.tabs, [
    {
      id: "/admin",
      href: "/admin",
      label: "แดชบอร์ด",
      closable: false,
      updatedAt: 10,
    },
    {
      id: "/admin/employees",
      href: "/admin/employees?sort=code",
      label: "พนักงาน",
      closable: true,
      updatedAt: 30,
    },
  ])
  assert.equal(normalized.activeId, "/admin/employees")
})

test("falls back active tab when stored activeId no longer exists", () => {
  const normalized = normalizePersistedAdminContextTabsState(
    {
      activeId: "/admin/missing",
      tabs: [
        {
          id: "/admin",
          href: "/admin",
          label: "แดชบอร์ด",
          closable: false,
          updatedAt: 10,
        },
        {
          id: "/admin/settings",
          href: "/admin/settings",
          label: "ตั้งค่า",
          closable: true,
          updatedAt: 40,
        },
      ],
    },
    10
  )

  assert.equal(normalized.activeId, "/admin/settings")
})
