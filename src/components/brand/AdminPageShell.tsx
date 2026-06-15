import { PageHeader } from "@/components/brand/PageHeader"

export function AdminPageShell({
  title,
  description,
  badge,
  action,
  fill = false,
  children,
}: {
  title: string
  description?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  fill?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={
        fill
          ? "flex h-full min-h-0 flex-col gap-3 overflow-hidden"
          : "flex flex-col gap-6"
      }
    >
      <PageHeader
        title={title}
        description={description}
        badge={badge}
        action={action}
      />
      <div
        className={
          fill
            ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card p-3 shadow-sm md:p-4 [&>*]:min-h-0"
            : "rounded-xl border border-border/80 bg-card p-4 shadow-sm md:p-6"
        }
      >
        {children}
      </div>
    </div>
  )
}
