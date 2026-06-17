import { z } from "zod"

export const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().optional())

export const checkboxBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean()
)

export const uuidOptional = z.preprocess((value) => {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().uuid().nullable().optional())
