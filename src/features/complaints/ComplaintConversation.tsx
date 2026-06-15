import { formatThaiDateTime } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

import { buildComplaintThread, type ComplaintThreadEntry } from "./thread"
import type { ComplaintRow } from "./data"

function ThreadBubble({ entry }: { entry: ComplaintThreadEntry }) {
  const isHr = entry.role === "hr"
  return (
    <div className={cn("flex", isHr ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-lg px-2.5 py-1.5 text-xs",
          isHr
            ? "bg-brand-red/10 text-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
          {isHr ? (entry.authorName ?? "HR") : (entry.authorName ?? "พนักงาน")}
          {" · "}
          {formatThaiDateTime(entry.at)}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{entry.message}</p>
      </div>
    </div>
  )
}

export function ComplaintConversation({
  complaint,
  compact = false,
}: {
  complaint: Pick<
    ComplaintRow,
    "body" | "createdAt" | "employeeName" | "replies" | "status"
  >
  compact?: boolean
}) {
  const thread = buildComplaintThread({
    body: complaint.body,
    createdAt: complaint.createdAt,
    employeeName: complaint.employeeName,
    replies: complaint.replies,
  })

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "max-h-40" : "max-h-56", "overflow-y-auto")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        ประวัติการสนทนา
        {complaint.status === "closed" ? " · ปิดเรื่องแล้ว" : null}
      </p>
      {thread.map((entry, index) => (
        <ThreadBubble key={`${entry.at}-${index}`} entry={entry} />
      ))}
    </div>
  )
}
