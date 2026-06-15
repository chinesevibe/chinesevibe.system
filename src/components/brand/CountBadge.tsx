export function CountBadge({
  count,
  label,
}: {
  count: number
  label?: string
}) {
  if (count <= 0) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-semibold text-brand-red">
      {count}
      {label ? ` ${label}` : ""}
    </span>
  )
}
