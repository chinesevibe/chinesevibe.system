export function AttendanceTrendBars({
  data,
  title,
}: {
  data: Array<{ day: string; count: number }>
  title: string
}) {
  const max = Math.max(1, ...data.map((d) => d.count))

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <ul className="flex items-end gap-1.5" style={{ height: 72 }}>
        {data.map((d) => (
          <li key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand-red/80"
              style={{ height: `${Math.round((d.count / max) * 56)}px`, minHeight: d.count ? 4 : 0 }}
              title={`${d.day}: ${d.count}`}
            />
            <span className="text-[9px] text-muted-foreground">{d.day}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
