export type ComplaintThreadEntry = {
  role: "employee" | "hr"
  message: string
  at: string
  authorName?: string | null
}

export function buildComplaintThread(options: {
  body: string
  createdAt: string
  employeeName: string | null
  replies: Array<{ message: string; createdAt: string; authorName?: string | null }>
}): ComplaintThreadEntry[] {
  const thread: ComplaintThreadEntry[] = [
    {
      role: "employee",
      message: options.body,
      at: options.createdAt,
      authorName: options.employeeName,
    },
  ]

  for (const reply of options.replies) {
    thread.push({
      role: "hr",
      message: reply.message,
      at: reply.createdAt,
      authorName: reply.authorName ?? "HR",
    })
  }

  return thread
}

/** Trim thread for LINE Flex size limits — keep latest entries. */
export function trimThreadForLine(
  thread: ComplaintThreadEntry[],
  maxEntries = 6,
  maxChars = 120
): ComplaintThreadEntry[] {
  const slice = thread.length > maxEntries ? thread.slice(-maxEntries) : thread
  return slice.map((entry) => ({
    ...entry,
    message:
      entry.message.length > maxChars
        ? `${entry.message.slice(0, maxChars - 1)}…`
        : entry.message,
  }))
}
