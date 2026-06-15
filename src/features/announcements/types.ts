export const ANNOUNCEMENT_TARGET_TYPES = ["all", "department"] as const

export type AnnouncementTargetType = (typeof ANNOUNCEMENT_TARGET_TYPES)[number]

export const ANNOUNCEMENT_STATUSES = ["draft", "scheduled", "sent"] as const

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]
