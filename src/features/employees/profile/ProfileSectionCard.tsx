import type { LucideIcon } from "lucide-react"

export function ProfileSectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-brand-red" aria-hidden />
          <h2 className="text-xs font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="grid content-start gap-x-3 gap-y-2 p-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

export function ProfileField({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm leading-snug text-foreground">{value || "—"}</p>
    </div>
  )
}
