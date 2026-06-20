import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  chunkItems,
  ictMinutesFromIso,
  resolveTimeKanbanBucketId,
  startMinutesFromWorkTimeText,
} from "@/lib/attendance/time-kanban"

describe("time kanban helpers", () => {
  it("parses work time text start minutes", () => {
    assert.equal(startMinutesFromWorkTimeText("13:00 – 22:00"), 13 * 60)
    assert.equal(startMinutesFromWorkTimeText("—"), null)
  })

  it("maps ICT times into the expected buckets", () => {
    assert.equal(ictMinutesFromIso("2026-06-20T03:30:00.000Z"), 630)
    assert.equal(
      resolveTimeKanbanBucketId({
        checkedInAt: null,
        checkedOutAt: "2026-06-19T19:04:00.000Z",
        workTimeText: "14:00 – 02:00",
        rosterDate: "2026-06-20",
        today: "2026-06-20",
      }),
      "overnight"
    )
    assert.equal(
      resolveTimeKanbanBucketId({
        checkedInAt: null,
        checkedOutAt: null,
        workTimeText: "10:00 – 19:00",
        rosterDate: "2026-06-20",
        today: "2026-06-20",
      }),
      "morning"
    )
  })

  it("uses the current ICT time for active records on today's board", () => {
    assert.equal(
      resolveTimeKanbanBucketId({
        checkedInAt: "2026-06-20T02:00:00.000Z",
        checkedOutAt: null,
        workTimeText: "10:00 – 19:00",
        rosterDate: "2026-06-20",
        today: "2026-06-20",
        now: new Date("2026-06-20T08:30:00.000Z"),
      }),
      "afternoon"
    )
  })

  it("chunks items into rows of three", () => {
    assert.deepEqual(chunkItems([1, 2, 3, 4, 5, 6, 7], 3), [
      [1, 2, 3],
      [4, 5, 6],
      [7],
    ])
  })
})
