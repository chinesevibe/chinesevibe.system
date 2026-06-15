/** BM legacy sub-routes — must not collide with HR branch slugs. */
const RESERVED_SLUGS = new Set(["team", "leaves", "overtime", "attendance"])

export type BranchSlugSource = {
  id: string
  name: string
  code: string | null
}

export function slugifyBranchSegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0E00-\u0E7F-]+/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "branch"
}

/** URL segment from branch code (preferred) or name. */
export function branchPathSlug(branch: BranchSlugSource): string {
  const fromCode = branch.code?.trim()
  if (fromCode) return slugifyBranchSegment(fromCode)
  return slugifyBranchSegment(branch.name)
}

/** HR branch detail path — /admin/branch/<slug> (not BM dashboard /admin/branch). */
export function branchAdminPath(branch: BranchSlugSource): string {
  const slug = branchPathSlug(branch)
  if (RESERVED_SLUGS.has(slug)) {
    return `/admin/branch/${slug}-${branch.id.slice(0, 8)}`
  }
  return `/admin/branch/${encodeURIComponent(slug)}`
}

export function branchAdminSubPath(
  branch: BranchSlugSource,
  section: "attendance" | "leaves" | "overtime"
): string {
  return `${branchAdminPath(branch)}/${section}`
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isBranchUuid(value: string): boolean {
  return UUID_RE.test(value)
}
