import type { messagingApi } from "@line/bot-sdk"

import { decideAttendanceLocation } from "@/lib/approval/attendance-location-decide"
import { decideDocument } from "@/lib/approval/document-decide"
import { decideLeave } from "@/lib/approval/leave-decide"
import { decideOvertime } from "@/lib/approval/overtime-decide"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import {
  assertHrLineApprover,
  assertHrOfficerLineApprover,
} from "@/lib/line/approval/approver"
import { createPendingAction } from "@/lib/line/approval/pending-actions"
import { buildPendingQueueMessages } from "@/lib/line/handlers/actions/pending-queue"
import {
  approveEmployeeRegistration,
} from "@/lib/registration/approve"
import type { ParsedApprovalPostback } from "@/lib/line/types"

function noPermission(locale: typeof DEFAULT_LOCALE): messagingApi.Message[] {
  return [{ type: "text", text: t("line.approval.noPermission", locale) }]
}

function alreadyDecided(locale: typeof DEFAULT_LOCALE): messagingApi.Message[] {
  return [{ type: "text", text: t("line.approval.alreadyDecided", locale) }]
}

function rejectPrompt(locale: typeof DEFAULT_LOCALE): messagingApi.Message[] {
  return [{ type: "text", text: t("line.approval.rejectPrompt", locale) }]
}

function success(text: string): messagingApi.Message[] {
  return [{ type: "text", text }]
}

function mapDecideError(
  result: { ok: false; error: string; status: number },
  locale: typeof DEFAULT_LOCALE
): messagingApi.Message[] {
  if (result.status === 409) return alreadyDecided(locale)
  if (result.status === 404) {
    return [{ type: "text", text: t("line.approval.notFound", locale) }]
  }
  return [{ type: "text", text: `❌ ${result.error}` }]
}

async function handleRegistrationApproval(
  action: "approve_registration" | "reject_registration",
  employeeId: string,
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE
  const approver = await assertHrLineApprover(lineUserId)
  if (!approver) return noPermission(locale)

  if (action === "approve_registration") {
    const result = await approveEmployeeRegistration(employeeId)
    if (!result.ok) {
      if (result.status === 404) {
        return [{ type: "text", text: t("line.approval.notFound", locale) }]
      }
      return [{ type: "text", text: `❌ ${result.error}` }]
    }
    return success(
      t("line.approval.registrationApproved", locale, {
        name: result.employeeName,
        approver: approver.name,
      })
    )
  }

  if (!lineUserId) {
    return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
  }

  await createPendingAction({
    lineUserId,
    approverEmployeeId: approver.id,
    actionKind: "reject_registration",
    targetId: employeeId,
  })

  return rejectPrompt(locale)
}

export async function handleApprovalPostback(
  parsed: ParsedApprovalPostback,
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  if (parsed.action === "pending_queue") {
    const approver = await assertHrLineApprover(lineUserId)
    if (!approver) return noPermission(locale)
    return buildPendingQueueMessages(lineUserId)
  }

  if (parsed.action === "approve_leave" || parsed.action === "reject_leave") {
    const approver = await assertHrOfficerLineApprover(lineUserId)
    if (!approver) return noPermission(locale)

    if (parsed.action === "reject_leave") {
      if (!lineUserId) {
        return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
      }
      await createPendingAction({
        lineUserId,
        approverEmployeeId: approver.id,
        actionKind: "reject_leave",
        targetId: parsed.leaveId,
      })
      return rejectPrompt(locale)
    }

    const result = await decideLeave({
      leaveId: parsed.leaveId,
      approverId: approver.id,
      action: "approve",
      hrStepOnly: true,
    })
    if (!result.ok) return mapDecideError(result, locale)
    return success(
      t("line.approval.leaveApproved", locale, { approver: approver.name })
    )
  }

  if (parsed.action === "approve_ot" || parsed.action === "reject_ot") {
    const approver = await assertHrOfficerLineApprover(lineUserId)
    if (!approver) return noPermission(locale)

    if (parsed.action === "reject_ot") {
      if (!lineUserId) {
        return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
      }
      await createPendingAction({
        lineUserId,
        approverEmployeeId: approver.id,
        actionKind: "reject_ot",
        targetId: parsed.otId,
      })
      return rejectPrompt(locale)
    }

    const result = await decideOvertime({
      otId: parsed.otId,
      approverId: approver.id,
      action: "approve",
      hrStepOnly: true,
    })
    if (!result.ok) return mapDecideError(result, locale)
    return success(
      t("line.approval.otApproved", locale, { approver: approver.name })
    )
  }

  if (
    parsed.action === "approve_document" ||
    parsed.action === "reject_document" ||
    parsed.action === "hold_document"
  ) {
    const approver = await assertHrLineApprover(lineUserId)
    if (!approver) return noPermission(locale)

    if (parsed.action === "reject_document") {
      if (!lineUserId) {
        return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
      }
      await createPendingAction({
        lineUserId,
        approverEmployeeId: approver.id,
        actionKind: "reject_document",
        targetId: parsed.docId,
      })
      return rejectPrompt(locale)
    }

    const docAction =
      parsed.action === "hold_document"
        ? "hold"
        : "approve"

    const result = await decideDocument({
      docId: parsed.docId,
      approverId: approver.id,
      action: docAction,
    })
    if (!result.ok) return mapDecideError(result, locale)
    return success(
      t("line.approval.documentUpdated", locale, {
        status: result.status,
        approver: approver.name,
      })
    )
  }

  if (
    parsed.action === "approve_attendance" ||
    parsed.action === "reject_attendance"
  ) {
    const approver = await assertHrLineApprover(lineUserId)
    if (!approver) return noPermission(locale)

    if (parsed.action === "reject_attendance") {
      if (!lineUserId) {
        return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
      }
      await createPendingAction({
        lineUserId,
        approverEmployeeId: approver.id,
        actionKind: "reject_attendance",
        targetId: parsed.attendanceId,
      })
      return rejectPrompt(locale)
    }

    const result = await decideAttendanceLocation({
      attendanceId: parsed.attendanceId,
      approverId: approver.id,
      action: "approve",
    })
    if (!result.ok) return mapDecideError(result, locale)
    return success(
      t("line.approval.attendanceApproved", locale, { approver: approver.name })
    )
  }

  if (parsed.action === "complaint_reply" || parsed.action === "complaint_close") {
    const approver = await assertHrLineApprover(lineUserId)
    if (!approver) return noPermission(locale)

    if (!lineUserId) {
      return [{ type: "text", text: t("line.approval.rejectNeedsChat", locale) }]
    }

    await createPendingAction({
      lineUserId,
      approverEmployeeId: approver.id,
      actionKind:
        parsed.action === "complaint_close" ? "complaint_close" : "complaint_reply",
      targetId: parsed.complaintId,
    })

    return [
      {
        type: "text",
        text:
          parsed.action === "complaint_close"
            ? t("line.approval.complaintClosePrompt", locale)
            : t("line.approval.complaintReplyPrompt", locale),
      },
    ]
  }

  return [{ type: "text", text: t("line.error.unknownMenu", locale) }]
}

export { handleRegistrationApproval }

export { handlePendingActionText as finalizePendingTextAction } from "@/lib/line/handlers/pending-action-text"
