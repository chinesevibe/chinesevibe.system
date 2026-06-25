"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useLocale } from "@/features/portal/LocaleProvider"
import { formatLeaveApiError } from "@/features/leave/balance"
import {
  countLeaveDays,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES,
  type LeaveType,
} from "@/features/leave/types"
import type { MessageKey } from "@/lib/i18n/messages"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"]

const DISPLAY_TYPES = LEAVE_TYPES.filter((t) => t !== "other") as LeaveType[]

function leaveTypeKey(type: LeaveType): MessageKey {
  return `leave.type.${type}` as MessageKey
}

function leaveAdvanceKey(type: LeaveType): MessageKey {
  return `leave.advance.${type}` as MessageKey
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E80012] focus:outline-none"

export function LeaveForm() {
  const { tx } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const leaveFormSchema = useMemo(
    () =>
      z
        .object({
          type: z.enum(LEAVE_TYPES, tx("leave.form.validation.type")),
          startDate: z.string().min(1, tx("leave.form.validation.startDate")),
          endDate: z.string().min(1, tx("leave.form.validation.endDate")),
          reason: z.string().trim().min(5, tx("leave.form.validation.reason")),
        })
        .refine((v) => countLeaveDays(v.startDate, v.endDate) !== null, {
          path: ["endDate"],
          message: tx("leave.form.validation.endBeforeStart"),
        }),
    [tx]
  )

  type LeaveFormValues = z.infer<typeof leaveFormSchema>

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    mode: "onTouched",
    defaultValues: { type: "sick", startDate: "", endDate: "", reason: "" },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form

  const [file, setFile] = useState<File | null>(null)
  const [leaveHours, setLeaveHours] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const type = watch("type")
  const startDate = watch("startDate")
  const endDate = watch("endDate")
  const days = countLeaveDays(startDate, endDate)
  const isSameDaySick = type === "sick" && startDate && endDate && startDate === endDate

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) { setFile(null); setFileError(null); return }
    if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
      setFile(null); setFileError(tx("leave.form.validation.fileType")); return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFile(null); setFileError(tx("leave.form.validation.fileSize")); return
    }
    setFile(selected); setFileError(null)
  }

  async function onSubmit(values: LeaveFormValues) {
    setSubmitting(true); setSubmitError(null); setSuccess(false)

    const formData = new FormData()
    formData.append("type", values.type)
    formData.append("startDate", values.startDate)
    formData.append("endDate", values.endDate)
    formData.append("reason", values.reason)
    if (file) formData.append("attachment", file)
    if (type === "sick" && leaveHours.trim()) formData.append("leaveHours", leaveHours.trim())

    try {
      const res = await fetch("/api/leave/request", { method: "POST", body: formData })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null
        throw new Error(formatLeaveApiError(body))
      }
      setSuccess(true)
      reset({ type: "sick", startDate: "", endDate: "", reason: "" })
      setFile(null); setLeaveHours("")
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : tx("leave.form.submitFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-5 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-medium text-green-700">{tx("leave.form.success")}</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-3 text-sm text-gray-400 underline"
        >
          {tx("leave.form.submitAgain")}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

      {/* ── Leave type pills ── */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">{tx("leave.form.typeLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t, { shouldValidate: true })}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                type === t
                  ? "border-[#E80012] bg-[#E80012] text-white"
                  : "border-gray-200 bg-white text-gray-600 active:bg-gray-50"
              }`}
            >
              {tx(leaveTypeKey(t))}
            </button>
          ))}
        </div>
        {/* advance notice hint */}
        <p className="mt-1.5 text-xs text-gray-400">{tx(leaveAdvanceKey(type))}</p>
      </div>

      {/* ── Date range ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("leave.form.startDate")}</p>
          <input type="date" {...register("startDate")} className={inputCls} />
          {errors.startDate && (
            <p className="mt-1 text-xs text-[#E80012]">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("leave.form.endDate")}</p>
          <input type="date" {...register("endDate")} min={startDate} className={inputCls} />
          {errors.endDate && (
            <p className="mt-1 text-xs text-[#E80012]">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* ── Same-day sick: hours input / else day count ── */}
      {isSameDaySick ? (
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("leave.form.sickHoursLabel")}</p>
          <input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            value={leaveHours}
            onChange={(e) => setLeaveHours(e.target.value)}
            placeholder={tx("leave.form.sickHoursPlaceholder")}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">{tx("leave.form.sickHoursDesc")}</p>
        </div>
      ) : days !== null ? (
        <p className="text-sm text-gray-500">
          จำนวน <span className="font-semibold text-gray-900">{days} วัน</span>
          {type === "sick" && (
            <span className="ml-2 text-xs">{tx("leave.form.sickRetroNote")}</span>
          )}
        </p>
      ) : null}

      {/* ── Reason ── */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">{tx("leave.form.reasonLabel")}</p>
        <textarea
          {...register("reason")}
          rows={3}
          placeholder={tx("leave.form.reasonPlaceholder")}
          className={`${inputCls} resize-none py-2`}
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-[#E80012]">{errors.reason.message}</p>
        )}
      </div>

      {/* ── File upload (sick leave only) ── */}
      {type === "sick" && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            {tx("leave.form.attachmentLabel")}
            {isSameDaySick && leaveHours.trim() ? " *" : ""}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white py-5 text-sm text-gray-400 active:bg-gray-50"
          >
            <span className="text-2xl">⬆</span>
            {file ? (
              <span className="font-medium text-gray-700">{file.name}</span>
            ) : (
              <span>กดเพื่ออัปโหลดรูป</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={onFileChange}
            className="hidden"
          />
          {fileError && <p className="mt-1 text-xs text-[#E80012]">{fileError}</p>}
        </div>
      )}

      {submitError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#E80012]">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-[#E80012] py-4 text-sm font-semibold text-white disabled:opacity-50 active:opacity-80"
      >
        {submitting ? tx("liff.common.submitting") : tx("leave.form.submit")}
      </button>
    </form>
  )
}
