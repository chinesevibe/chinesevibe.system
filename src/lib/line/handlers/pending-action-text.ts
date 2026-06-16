import type { messagingApi } from "@line/bot-sdk"

import { decideAttendanceLocation } from "@/lib/approval/attendance-location-decide"
import { decideDocument } from "@/lib/approval/document-decide"
import { decideLeave } from "@/lib/approval/leave-decide"
import { decideOvertime } from "@/lib/approval/overtime-decide"
import { replyComplaint } from "@/lib/approval/complaint-reply"
import { rejectEmployeeRegistration } from "@/lib/registration/approve"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import {
  consumePendingAction,
  getActivePendingAction,
} from "@/lib/line/approval/pending-actions"

export async function handlePendingActionText(
  lineUserId: string,
  text: string
): Promise<messagingApi.Message[] | null> {
  const pending = await getActivePendingAction(lineUserId)
  if (!pending) return null

  const locale = await resolveLocaleForLineUser(lineUserId)
  const note = text.trim()

  if (note.length < 3) {
    return [{ type: "text", text: t("line.approval.noteTooShort", locale) }]
  }

  const consumed = await consumePendingAction(lineUserId, note)
  if (!consumed.ok) {
    if (consumed.reason === "too_short") {
      return [{ type: "text", text: t("line.approval.noteTooShort", locale) }]
    }
    return [{ type: "text", text: t("line.approval.pendingExpired", locale) }]
  }

  const { row, note: trimmedNote } = consumed
  const approverId = row.approver_employee_id
  const approverName = "HR"

  switch (row.action_kind) {
    case "reject_leave": {
      const result = await decideLeave({
        leaveId: row.target_id,
        approverId,
        action: "reject",
        note: trimmedNote,
        hrStepOnly: true,
      })
      if (!result.ok) {
        return [
          {
            type: "text",
            text:
              result.status === 409
                ? t("line.approval.alreadyDecided", locale)
                : `❌ ${result.error}`,
          },
        ]
      }
      return [
        {
          type: "text",
          text: t("line.approval.leaveRejected", locale, { approver: approverName }),
        },
      ]
    }
    case "reject_ot": {
      const result = await decideOvertime({
        otId: row.target_id,
        approverId,
        action: "reject",
        note: trimmedNote,
        hrStepOnly: true,
      })
      if (!result.ok) {
        return [
          {
            type: "text",
            text:
              result.status === 409
                ? t("line.approval.alreadyDecided", locale)
                : `❌ ${result.error}`,
          },
        ]
      }
      return [
        {
          type: "text",
          text: t("line.approval.otRejected", locale, { approver: approverName }),
        },
      ]
    }
    case "reject_registration": {
      const result = await rejectEmployeeRegistration(
        row.target_id,
        trimmedNote,
        approverId
      )
      if (!result.ok) {
        return [{ type: "text", text: `❌ ${result.error}` }]
      }
      return [
        {
          type: "text",
          text: t("line.approval.registrationRejected", locale, {
            name: result.employeeName,
            approver: approverName,
            note: trimmedNote,
          }),
        },
      ]
    }
    case "reject_document": {
      const result = await decideDocument({
        docId: row.target_id,
        approverId,
        action: "reject",
        note: trimmedNote,
      })
      if (!result.ok) {
        return [
          {
            type: "text",
            text:
              result.status === 409
                ? t("line.approval.alreadyDecided", locale)
                : `❌ ${result.error}`,
          },
        ]
      }
      return [
        {
          type: "text",
          text: t("line.approval.documentRejected", locale, { approver: approverName }),
        },
      ]
    }
    case "reject_attendance": {
      const result = await decideAttendanceLocation({
        attendanceId: row.target_id,
        approverId,
        action: "reject",
        note: trimmedNote,
      })
      if (!result.ok) {
        return [
          {
            type: "text",
            text:
              result.status === 409
                ? t("line.approval.alreadyDecided", locale)
                : `❌ ${result.error}`,
          },
        ]
      }
      return [
        {
          type: "text",
          text: t("line.approval.attendanceRejected", locale, { approver: approverName }),
        },
      ]
    }
    case "complaint_reply": {
      const result = await replyComplaint({
        complaintId: row.target_id,
        approverId,
        approverName,
        message: trimmedNote,
        close: false,
      })
      if (!result.ok) {
        return [{ type: "text", text: `❌ ${result.error}` }]
      }
      return [
        {
          type: "text",
          text: t("line.approval.complaintReplied", locale, { approver: approverName }),
        },
      ]
    }
    case "complaint_close": {
      const result = await replyComplaint({
        complaintId: row.target_id,
        approverId,
        approverName,
        message: trimmedNote,
        close: true,
      })
      if (!result.ok) {
        return [{ type: "text", text: `❌ ${result.error}` }]
      }
      return [
        {
          type: "text",
          text: t("line.approval.complaintClosed", locale, { approver: approverName }),
        },
      ]
    }
    default:
      return [{ type: "text", text: t("line.error.unknownMenu", DEFAULT_LOCALE) }]
  }
}
